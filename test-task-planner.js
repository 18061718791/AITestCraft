const taskPlanner = require('./.trae/skills/task-planner/index.js');

async function testTaskPlanner() {
  console.log('Testing Task Planner Skill...\n');
  
  const requirements = [
    'Implement rule-based matching system',
    'Integrate with LLM-based recognition',
    'Create fusion strategy for combining results',
    'Optimize confidence scoring mechanism'
  ];
  
  const implementationSteps = [
    'Create RuleMatcher class in IntentRecognizer.ts',
    'Implement fusion logic in recognizeIntent method',
    'Add confidence scoring for rule-based matches',
    'Add confidence scoring for LLM-based matches',
    'Test fusion with various query types'
  ];
  
  const acceptanceCriteria = [
    'Intent recognition accuracy improved by 20%',
    'Confidence scores properly calculated',
    'No conflicts between rule-based and LLM results'
  ];
  
  const dependencies = [];
  
  const testCases = [
    {
      name: 'Test rule-based matching',
      description: 'Verify rule-based matching works correctly',
      setup: 'Ensure IntentRecognizer.ts is updated',
      steps: [
        'Navigate to backend/src/services/intelligentQa/IntentRecognizer.ts',
        'Check for RuleMatcher class implementation',
        'Verify fusion logic in recognizeIntent method',
        'Test with rule-based queries like "问题列表"'
      ],
      expected: 'Rule-based matching returns correct intent'
    },
    {
      name: 'Test LLM-based matching',
      description: 'Verify LLM-based matching works correctly',
      setup: 'Ensure LLMIntentParser.ts is configured',
      steps: [
        'Navigate to backend/src/services/intelligentQa/LLMIntentParser.ts',
        'Check API configuration',
        'Test with LLM-based queries',
        'Verify confidence scores'
      ],
      expected: 'LLM-based matching returns correct intent'
    },
    {
      name: 'Test fusion strategy',
      description: 'Verify fusion strategy works correctly',
      setup: 'Ensure both systems are working',
      steps: [
        'Test queries that match both rule-based and LLM',
        'Verify fusion logic selects best result',
        'Check confidence scoring',
        'Verify no conflicts occur'
      ],
      expected: 'Fusion strategy returns best intent'
    }
  ];
  
  try {
    const result = await taskPlanner.runFullWorkflow(
      'multi-model-fusion',
      requirements,
      implementationSteps,
      acceptanceCriteria,
      dependencies,
      testCases
    );
    
    console.log('\n=== Test Result ===');
    console.log(`Success: ${result.success}`);
    console.log(`Stage: ${result.stage}`);
    
    if (result.success) {
      console.log('\n=== Workflow Results ===');
      console.log('Plan:', result.results.plan);
      console.log('Execution:', result.results.execution);
      console.log('Script:', result.results.script);
      console.log('Validation:', result.results.validation);
      console.log('Cleanup:', result.results.cleanup);
    } else {
      console.log('\n=== Workflow Failed ===');
      console.log(`Stage: ${result.stage}`);
      console.log(`Error: ${result.error}`);
    }
    
  } catch (error) {
    console.error('Error testing task planner:', error);
  }
}

testTaskPlanner();
