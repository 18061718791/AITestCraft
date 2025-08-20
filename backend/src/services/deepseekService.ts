import axios, { AxiosInstance, AxiosError } from 'axios';
import config from '../config';
import logger from '../utils/logger';
import { TestPoint, TestCase } from '../types';
import { readFileSync } from 'fs';
import { join } from 'path';

export class DeepSeekService {
  private client: AxiosInstance;
  private testPointsPrompt: string;
  private testCasesPrompt: string;

  constructor() {
    this.client = axios.create({
      baseURL: config.deepseek.apiUrl,
      timeout: config.deepseek.timeout,
      headers: {
        'Authorization': `Bearer ${config.deepseek.apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    // Load prompt templates
    this.testPointsPrompt = readFileSync(
      join(process.cwd(), '..', 'prompts', 'generate_test_points.md'),
      'utf-8'
    );
    this.testCasesPrompt = readFileSync(
      join(process.cwd(), '..', 'prompts', 'generate_test_cases.md'),
      'utf-8'
    );

    // Request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        logger.debug('DeepSeek API request:', {
          url: config.url,
          method: config.method,
        });
        return config;
      },
      (error) => {
        logger.error('DeepSeek API request error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response) {
          logger.error('DeepSeek API response error:', {
            status: error.response.status,
            data: error.response.data,
          });
        } else if (error.request) {
          logger.error('DeepSeek API network error:', error.message);
        } else {
          logger.error('DeepSeek API setup error:', error.message);
        }
        return Promise.reject(error);
      }
    );
  }

  async generateTestPoints(requirement: string): Promise<TestPoint[]> {
    const prompt = this.testPointsPrompt.replace('{requirement}', requirement);
    
    logger.info('deepseek_service', 'generating_test_points', {
      requirementLength: requirement.length,
      promptLength: prompt.length,
      promptPreview: prompt.substring(0, 500) + (prompt.length > 500 ? '...' : '')
    });

    logger.debug('deepseek_service', 'full_prompt', {
      requirement,
      prompt
    });

    try {
      const response = await this.makeAPICall(prompt);
      logger.debug('deepseek_service', 'raw_response', {
        response: response.substring(0, 1000) + (response.length > 1000 ? '...' : ''),
        responseLength: response.length
      });
      
      const testPoints = this.parseTestPoints(response);
      
      logger.info('deepseek_service', 'test_points_generated', {
        pointsCount: testPoints.length,
        points: testPoints.slice(0, 3),
        allPoints: testPoints
      });
      
      return testPoints;
    } catch (error) {
      logger.error('deepseek_service', 'test_points_generation_failed', error, {
        requirementLength: requirement.length,
        requirement: requirement.substring(0, 200) + (requirement.length > 200 ? '...' : '')
      });
      throw new Error('Failed to generate test points from AI service');
    }
  }

  async generateTestCases(testPoints: string[]): Promise<TestCase[]> {
    const testPointsText = testPoints.join('\n');
    const prompt = this.testCasesPrompt.replace('{test_points}', testPointsText);
    
    logger.info('deepseek_service', 'generating_test_cases', {
      testPointsCount: testPoints.length,
      promptLength: prompt.length,
      testPointsPreview: testPoints.slice(0, 3)
    });

    try {
      const response = await this.makeAPICall(prompt);
      const testCases = this.parseTestCases(response);
      
      logger.info('deepseek_service', 'test_cases_generated', {
        casesCount: testCases.length,
        cases: testCases.slice(0, 2)
      });
      
      return testCases;
    } catch (error) {
      logger.error('deepseek_service', 'test_cases_generation_failed', error, {
        testPointsCount: testPoints.length
      });
      throw new Error('Failed to generate test cases from AI service');
    }
  }

  private async makeAPICall(prompt: string): Promise<string> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= config.deepseek.maxRetries; attempt++) {
      try {
        logger.info('deepseek_service', 'api_call_attempt', {
          attempt,
          maxRetries: config.deepseek.maxRetries,
          promptLength: prompt.length,
          promptPreview: prompt.substring(0, 100) + (prompt.length > 100 ? '...' : '')
        });

        const requestData = {
          model: 'deepseek-chat',
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
          max_tokens: 4000,
          temperature: 0.7,
        };

        logger.debug('deepseek_service', 'api_request_data', {
          attempt,
          url: '/chat/completions',
          requestData
        });

        const response = await this.client.post('/chat/completions', requestData);

        logger.debug('deepseek_service', 'api_response_raw', {
          attempt,
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
          data: response.data
        });

        const content = response.data.choices?.[0]?.message?.content;
        if (!content) {
          logger.error('deepseek_service', 'empty_response_error', {
            attempt,
            responseData: response.data,
            choices: response.data.choices
          });
          throw new Error('Empty response from AI service');
        }

        logger.info('deepseek_service', 'api_call_success', {
          attempt,
          responseLength: content.length,
          responsePreview: content.substring(0, 200)
        });

        return content.trim();
      } catch (error) {
        lastError = error as Error;
        logger.warn('deepseek_service', 'api_call_attempt_failed', {
          attempt,
          error: error instanceof Error ? error.message : String(error),
          errorStack: error instanceof Error ? error.stack : undefined,
          errorType: error?.constructor?.name || typeof error
        });
        
        if (attempt < config.deepseek.maxRetries) {
          const delay = config.deepseek.retryDelay * Math.pow(2, attempt - 1);
          logger.info('deepseek_service', 'retrying_api_call', {
            attempt,
            delay,
            remainingAttempts: config.deepseek.maxRetries - attempt
          });
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    logger.error('deepseek_service', 'api_call_max_retries_exceeded', lastError, {
      maxRetries: config.deepseek.maxRetries,
      lastError: lastError?.message,
      lastErrorStack: lastError?.stack
    });
    throw lastError || new Error('Max retries exceeded');
  }

  private parseTestPoints(content: string): TestPoint[] {
    logger.debug('deepseek_service', 'parsing_test_points', {
      responseLength: content.length,
      responsePreview: content.substring(0, 500) + (content.length > 500 ? '...' : '')
    });

    try {
      const testPoints: TestPoint[] = [];
      
      // Try to find JSON array
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          logger.debug('deepseek_service', 'json_parsed_success', {
            parsedType: typeof parsed,
            isArray: Array.isArray(parsed),
            arrayLength: Array.isArray(parsed) ? parsed.length : 0,
            firstItem: Array.isArray(parsed) && parsed.length > 0 ? parsed[0] : null
          });

          if (Array.isArray(parsed)) {
            const mappedPoints = parsed.map((item: any, index: number): TestPoint => ({
            id: `tp-${Date.now()}-${index}`,
            title: item.title || item.name || item.testPoint || `Test Point ${index + 1}`,
            description: item.description || item.testDescription || '',
            priority: (item.priority || 'medium') as TestPoint['priority'],
            category: (item.category || 'functional') as TestPoint['category'],
            expectedResult: item.expectedResult || item.expected || '',
            testSteps: item.testSteps || item.steps || [],
            content: item.content || item.title || item.description || `测试点 ${index + 1}: ${item.title || item.name || item.testPoint || '未命名测试点'}`
          }));
            logger.debug('deepseek_service', 'json_points_mapped', {
              originalCount: parsed.length,
              mappedCount: mappedPoints.length,
              samplePoints: mappedPoints.slice(0, 2)
            });
            return mappedPoints;
          }
        } catch (e) {
          logger.warn('deepseek_service', 'json_parse_failed', { 
            error: e instanceof Error ? e.message : String(e),
            jsonString: jsonMatch[0].substring(0, 200) + (jsonMatch[0].length > 200 ? '...' : '')
          });
        }
      } else {
        logger.debug('deepseek_service', 'no_json_array_found', {
          responsePreview: content.substring(0, 200)
        });
      }

      // Try to parse as plain text
      const lines = content.split('\n').filter(line => line.trim());
      logger.debug('deepseek_service', 'parsing_plain_text', {
        totalLines: lines.length,
        lines: lines.slice(0, 5)
      });

      let currentTestPoint: any = {};
      
      for (let i = 0; i < lines.length; i++) {
        const line = (lines[i] || '').trim();
        
        if (line.match(/^\d+\./) || line.startsWith('-') || line.startsWith('*')) {
          if (currentTestPoint.title) {
            testPoints.push({
              id: `tp-${Date.now()}-${testPoints.length}`,
              title: currentTestPoint.title || `Test Point ${testPoints.length + 1}`,
              description: currentTestPoint.description || '',
              priority: (currentTestPoint.priority || 'medium') as TestPoint['priority'],
              category: (currentTestPoint.category || 'functional') as TestPoint['category'],
              expectedResult: currentTestPoint.expectedResult || '',
              testSteps: currentTestPoint.testSteps || []
            });
          }
          
          currentTestPoint = {
            title: line.replace(/^\d+\.|^[-*]\s*/, '').trim()
          };
        } else if (line.toLowerCase().includes('description:')) {
          currentTestPoint.description = line.split(':').slice(1).join(':').trim();
        } else if (line.toLowerCase().includes('expected:')) {
          currentTestPoint.expectedResult = line.split(':').slice(1).join(':').trim();
        } else if (line.toLowerCase().includes('priority:')) {
          currentTestPoint.priority = line.split(':').slice(1).join(':').trim().toLowerCase();
        } else if (line.toLowerCase().includes('category:')) {
          currentTestPoint.category = line.split(':').slice(1).join(':').trim().toLowerCase();
        } else if (line.toLowerCase().includes('steps:')) {
          const steps: string[] = [];
          let j = i + 1;
          while (j < lines.length && (lines[j] || '').match(/^\s{2,}/)) {
            steps.push((lines[j] || '').trim());
            j++;
          }
          i = j - 1;
          currentTestPoint.testSteps = steps;
        }
      }

      if (currentTestPoint.title) {
        testPoints.push({
          id: `tp-${Date.now()}-${testPoints.length}`,
          title: currentTestPoint.title || `Test Point ${testPoints.length + 1}`,
          description: currentTestPoint.description || '',
          priority: (currentTestPoint.priority || 'medium') as TestPoint['priority'],
          category: (currentTestPoint.category || 'functional') as TestPoint['category'],
          expectedResult: currentTestPoint.expectedResult || '',
          testSteps: currentTestPoint.testSteps || [],
          content: currentTestPoint.content || currentTestPoint.description || currentTestPoint.title || `测试点 ${testPoints.length + 1}: ${currentTestPoint.title || '未命名测试点'}`
        });
      }

      if (testPoints.length === 0) {
        logger.error('deepseek_service', 'no_test_points_parsed', {
          response: content.substring(0, 500) + (content.length > 500 ? '...' : ''),
          linesCount: lines.length
        });
        throw new Error('No test points could be parsed from response');
      }

      logger.info('deepseek_service', 'test_points_parsed_success', {
        totalPoints: testPoints.length,
        points: testPoints.slice(0, 3),
        allPoints: testPoints
      });

      return testPoints;
    } catch (error) {
      logger.error('deepseek_service', 'parse_test_points_failed', error, {
        response: content.substring(0, 300) + (content.length > 300 ? '...' : '')
      });
      throw new Error('Failed to parse test points from AI response');
    }
  }

  private parseTestCases(content: string): TestCase[] {
    try {
      // Try to parse as JSON first
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const cases = JSON.parse(jsonMatch[0]);
        if (Array.isArray(cases)) {
          return cases.map((testCase, index) => ({
            ...testCase,
            number: testCase.number || `Test${String(index + 1).padStart(4, '0')}`,
            actual_result: '待测试',
            pass_fail: '待测试',
          }));
        }
      }

      // Fallback: try to extract structured data
      return this.extractTestCasesFromText(content);
    } catch (error) {
      logger.error('Failed to parse test cases:', error);
      throw new Error('Invalid test case format from AI service');
    }
  }

  private extractTestCasesFromText(content: string): TestCase[] {
    // This is a fallback method to extract test cases from plain text
    // In practice, the AI should return valid JSON
    const cases: TestCase[] = [];
    
    // Simple extraction logic - this should be improved based on actual AI response format
    const lines = content.split('\n');
    let currentCase: Partial<TestCase> = {};
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      if (trimmed.includes('"number"')) {
        if (currentCase.number && currentCase.title) {
          cases.push({
            ...currentCase,
            actual_result: '待测试',
            pass_fail: '待测试',
          } as TestCase);
        }
        currentCase = {};
        const match = trimmed.match(/"number":\s*"?([^",]+)"?/);
        if (match && match[1]) currentCase.number = match[1];
      } else if (trimmed.includes('"title"')) {
        const match = trimmed.match(/"title":\s*"([^"]+)"/);
        if (match && match[1]) currentCase.title = match[1];
      } else if (trimmed.includes('"module"')) {
        const match = trimmed.match(/"module":\s*"([^"]+)"/);
        if (match && match[1]) currentCase.module = match[1];
      }
    }

    if (currentCase.number && currentCase.title) {
      cases.push({
        ...currentCase,
        actual_result: '待测试',
        pass_fail: '待测试',
      } as TestCase);
    }

    if (cases.length === 0) {
      throw new Error('No test cases found in AI response');
    }

    return cases;
  }
}

export default new DeepSeekService();