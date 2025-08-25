// import { deletionCheckService } from '../deletionCheckService';
// import { PrismaClient } from '@prisma/client';

// jest.mock('@prisma/client', () => ({
//   PrismaClient: jest.fn().mockImplementation(() => ({
//     module: {
//       count: jest.fn()
//     },
//     scenario: {
//       count: jest.fn()
//     }
//   }))
// }));

// describe('DeletionCheckService', () => {
//   let mockPrisma: any;

//   beforeEach(() => {
//     mockPrisma = new PrismaClient();
//     jest.clearAllMocks();
//   });

//   describe('checkSystemDeletion', () => {
//     it('应该允许删除无模块的系统', async () => {
//       mockPrisma.module.count.mockResolvedValue(0);
      
//       const result = await deletionCheckService.checkSystemDeletion('test-system-id');
      
//       expect(result.canDelete).toBe(true);
//       expect(result.childCount).toBe(0);
//       expect(result.message).toBe('系统可以删除');
//     });

//     it('应该阻止删除包含模块的系统', async () => {
//       mockPrisma.module.count.mockResolvedValue(3);
      
//       const result = await deletionCheckService.checkSystemDeletion('test-system-id');
      
//       expect(result.canDelete).toBe(false);
//       expect(result.childCount).toBe(3);
//       expect(result.childType).toBe('modules');
//       expect(result.message).toContain('3个模块');
//     });
//   });

//   describe('checkModuleDeletion', () => {
//     it('应该允许删除无场景的模块', async () => {
//       mockPrisma.scenario.count.mockResolvedValue(0);
      
//       const result = await deletionCheckService.checkModuleDeletion('test-module-id');
      
//       expect(result.canDelete).toBe(true);
//       expect(result.childCount).toBe(0);
//       expect(result.message).toBe('模块可以删除');
//     });

//     it('应该阻止删除包含场景的模块', async () => {
//       mockPrisma.scenario.count.mockResolvedValue(5);
      
//       const result = await deletionCheckService.checkModuleDeletion('test-module-id');
      
//       expect(result.canDelete).toBe(false);
//       expect(result.childCount).toBe(5);
//       expect(result.childType).toBe('scenarios');
//       expect(result.message).toContain('5个场景');
//     });
//   });
// });