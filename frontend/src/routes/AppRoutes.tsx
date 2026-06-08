import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from '../layouts/MainLayout';
import FeatureLayout from '../layouts/FeatureLayout';
import TraditionalLayout from '../layouts/TraditionalLayout';
import { useLayoutMode } from '../contexts/LayoutModeContext';
import { TestCaseAssistantPage } from '../pages/TestCaseAssistantPage';
import HomePage from '../pages/HomePage';
import PromptManagementPage from '../pages/PromptManagementPage';
import PromptDetailPage from '../pages/PromptDetailPage';
import PromptEditPage from '../pages/PromptEditPage';
import SystemManagement from '../pages/SystemManagement';
import TestCaseManagementPage from '../pages/TestCaseManagementPage';
import AdminHomePage from '../pages/admin/AdminHomePage';
import DatabaseConfigPage from '../pages/admin/DatabaseConfigPage';
import LLMConfigPage from '../pages/admin/LLMConfigPage';
import SystemMonitoringPage from '../pages/admin/SystemMonitoringPage';
import PluginManagementPage from '../pages/admin/PluginManagementPage';
import TodoReminderConfigPage from '../pages/admin/TodoReminderConfigPage';
import ShortcutConfigPage from '../pages/admin/ShortcutConfigPage';

import DefectListPage from '../pages/defect/DefectListPage';
import DefectAnalysisPage from '../pages/defect/DefectAnalysisPage';
import MyTodoPage from '../pages/defect/MyTodoPage';
import NotificationConfigPage from '../pages/defect/NotificationConfigPage';
import DefectAssistantPage from '../pages/defect/DefectAssistantPage';
import ProjectManagementPage from '../pages/defect/ProjectManagementPage';
import UrgentIssueTrackerPage from '../pages/defect/UrgentIssueTrackerPage';
import PendingDeploymentsPage from '../pages/app-management/PendingDeploymentsPage';
import DeploymentHistoryPage from '../pages/app-management/DeploymentHistoryPage';
import AppConfigPage from '../pages/app-management/AppConfigPage';
import SystemSelectorDebug from '../components/SystemSelectorDebug';
import DetailedSystemSelectorDebug from '../components/DetailedSystemSelectorDebug';
import SimpleSystemTest from '../components/SimpleSystemTest';
import DirectApiTest from '../components/DirectApiTest';
import SystemDataDisplay from '../components/SystemDataDisplay';
import ApiFormatTest from '../components/ApiFormatTest';
import SimpleSystemSelector from '../components/SimpleSystemSelector';
import LoginPage from '../pages/LoginPage';
import UserManagementPage from '../pages/UserManagementPage';
import RoleManagementPage from '../pages/RoleManagementPage';
import { ProtectedRoute } from '../components/ProtectedRoute';

export const AppRoutes: React.FC = () => {
  const { layoutMode } = useLayoutMode();

  return (
    <Routes>
      {/* 登录页 - 无布局，公开访问 */}
      <Route path="/login" element={<LoginPage />} />

      {/* 功能模块 - 根据布局模式选择对应的 Layout */}
      {layoutMode === 'modern' ? (
        <>
          {/* 极客模式首页 - 独立布局 */}
          <Route path="/" element={
            <ProtectedRoute>
              <HomePage />
            </ProtectedRoute>
          } />
          
          <Route element={
            <ProtectedRoute>
              <FeatureLayout />
            </ProtectedRoute>
          }>
            {/* 用例管理模块 */}
            <Route path="assistant" element={<TestCaseAssistantPage />} />
            <Route path="test-cases" element={<TestCaseManagementPage />} />
            <Route path="prompts" element={<PromptManagementPage />} />
            <Route path="prompts/:filename" element={<PromptDetailPage />} />
            <Route path="prompts/:filename/edit" element={<PromptEditPage />} />
            <Route path="system" element={<SystemManagement />} />

            {/* 缺陷管理模块 */}
            <Route path="defects" element={<DefectAnalysisPage />} />
            <Route path="defects/list" element={<DefectListPage />} />
            <Route path="defects/urgent" element={<UrgentIssueTrackerPage />} />
            <Route path="defects/todo" element={<MyTodoPage />} />
            <Route path="defects/assistant" element={<DefectAssistantPage />} />

            {/* 系统管理模块 - 项目管理和消息推送配置 */}
            <Route path="admin/project" element={<ProjectManagementPage />} />
            <Route path="admin/notification" element={<NotificationConfigPage />} />

            {/* 应用管理模块 */}
            <Route path="app-management/pending" element={<PendingDeploymentsPage />} />
            <Route path="app-management/history" element={<DeploymentHistoryPage />} />
            <Route path="app-management/config" element={<AppConfigPage />} />

            {/* 系统管理模块 */}
            <Route path="admin" element={<AdminHomePage />} />
            <Route path="admin/database" element={<DatabaseConfigPage />} />
            <Route path="admin/llm" element={<LLMConfigPage />} />
            <Route path="admin/monitoring" element={<SystemMonitoringPage />} />
            <Route path="admin/plugins" element={<PluginManagementPage />} />
            <Route path="admin/todo-reminder" element={<TodoReminderConfigPage />} />
            <Route path="admin/shortcuts" element={<ShortcutConfigPage />} />

            {/* 用户管理 - 需要权限 */}
            <Route path="admin/users" element={<UserManagementPage />} />

            {/* 角色管理 - 需要权限 */}
            <Route path="admin/roles" element={<RoleManagementPage />} />
          </Route>
        </>
      ) : (
        <Route element={
          <ProtectedRoute>
            <TraditionalLayout />
          </ProtectedRoute>
        }>
          {/* 经典模式首页 - 包含在TraditionalLayout中 */}
          <Route path="/" element={<HomePage hideModeSwitch />} />
          
          {/* 用例管理模块 */}
          <Route path="assistant" element={<TestCaseAssistantPage />} />
          <Route path="test-cases" element={<TestCaseManagementPage />} />
          <Route path="prompts" element={<PromptManagementPage />} />
          <Route path="prompts/:filename" element={<PromptDetailPage />} />
          <Route path="prompts/:filename/edit" element={<PromptEditPage />} />
          <Route path="system" element={<SystemManagement />} />

          {/* 缺陷管理模块 */}
          <Route path="defects" element={<DefectAnalysisPage />} />
          <Route path="defects/list" element={<DefectListPage />} />
          <Route path="defects/urgent" element={<UrgentIssueTrackerPage />} />
          <Route path="defects/todo" element={<MyTodoPage />} />
          <Route path="defects/assistant" element={<DefectAssistantPage />} />

          {/* 系统管理模块 - 项目管理和消息推送配置 */}
          <Route path="admin/project" element={<ProjectManagementPage />} />
          <Route path="admin/notification" element={<NotificationConfigPage />} />

          {/* 应用管理模块 */}
          <Route path="app-management/pending" element={<PendingDeploymentsPage />} />
          <Route path="app-management/history" element={<DeploymentHistoryPage />} />
          <Route path="app-management/config" element={<AppConfigPage />} />

          {/* 系统管理模块 */}
          <Route path="admin" element={<AdminHomePage />} />
          <Route path="admin/database" element={<DatabaseConfigPage />} />
          <Route path="admin/llm" element={<LLMConfigPage />} />
          <Route path="admin/monitoring" element={<SystemMonitoringPage />} />
          <Route path="admin/plugins" element={<PluginManagementPage />} />
          <Route path="admin/todo-reminder" element={<TodoReminderConfigPage />} />
          <Route path="admin/shortcuts" element={<ShortcutConfigPage />} />

          {/* 用户管理 - 需要权限 */}
          <Route path="admin/users" element={<UserManagementPage />} />

          {/* 角色管理 - 需要权限 */}
          <Route path="admin/roles" element={<RoleManagementPage />} />
        </Route>
      )}

      {/* Debug路由 - 保持原有布局 */}
      <Route path="/" element={<MainLayout />}>
        <Route path="debug/system-selector" element={<SystemSelectorDebug />} />
        <Route path="debug/detailed-system-selector" element={<DetailedSystemSelectorDebug />} />
        <Route path="debug/simple-system-test" element={<SimpleSystemTest />} />
        <Route path="debug/direct-api-test" element={<DirectApiTest />} />
        <Route path="debug/system-data-display" element={<SystemDataDisplay />} />
        <Route path="debug/api-format-test" element={<ApiFormatTest />} />
        <Route path="debug/simple-system-selector" element={<SimpleSystemSelector />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};
