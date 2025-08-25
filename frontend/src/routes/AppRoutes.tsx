import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from '../layouts/MainLayout';
import { TestCaseAssistantPage } from '../pages/TestCaseAssistantPage';
import HomePage from '../pages/HomePage';
import PromptManagementPage from '../pages/PromptManagementPage';
import PromptDetailPage from '../pages/PromptDetailPage';
import PromptEditPage from '../pages/PromptEditPage';
import SystemManagement from '../pages/SystemManagement';
import TestCaseManagementPage from '../pages/TestCaseManagementPage';
import SystemSelectorDebug from '../components/SystemSelectorDebug';
import DetailedSystemSelectorDebug from '../components/DetailedSystemSelectorDebug';
import SimpleSystemTest from '../components/SimpleSystemTest';
import DirectApiTest from '../components/DirectApiTest';
import SystemDataDisplay from '../components/SystemDataDisplay';
import ApiFormatTest from '../components/ApiFormatTest';
import SimpleSystemSelector from '../components/SimpleSystemSelector';

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<MainLayout />}>
        <Route index element={<HomePage />} />
        <Route path="assistant" element={<TestCaseAssistantPage />} />
        <Route path="test-cases" element={<TestCaseManagementPage />} />
        <Route path="prompts" element={<PromptManagementPage />} />
        <Route path="prompts/:filename" element={<PromptDetailPage />} />
        <Route path="prompts/:filename/edit" element={<PromptEditPage />} />
        <Route path="system" element={<SystemManagement />} />
        <Route path="debug/system-selector" element={<SystemSelectorDebug />} />
        <Route path="debug/detailed-system-selector" element={<DetailedSystemSelectorDebug />} />
        <Route path="debug/simple-system-test" element={<SimpleSystemTest />} />
        <Route path="/debug/direct-api-test" element={<DirectApiTest />} />
        <Route path="/debug/system-data-display" element={<SystemDataDisplay />} />
        <Route path="/debug/api-format-test" element={<ApiFormatTest />} />
        <Route path="/debug/simple-system-selector" element={<SimpleSystemSelector />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};