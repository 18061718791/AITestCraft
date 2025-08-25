import { Router } from 'express';
import multer from 'multer';
import { BatchController, importValidation, deleteValidation } from '../controllers/batchController';

const router = Router();
const batchController = new BatchController();

// 配置文件上传
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
    ];
    
    if (allowedTypes.includes(file.mimetype) || 
        file.originalname.endsWith('.xlsx') || 
        file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('不支持的文件格式，请上传.xlsx或.csv文件'));
    }
  },
});

// 批量导入相关路由
router.post(
  '/test-cases/batch/validate',
  upload.single('file'),
  batchController.validateImportFile
);

router.post(
  '/test-cases/batch/import',
  upload.single('file'),
  importValidation,
  batchController.importTestCases
);

router.get(
  '/test-cases/batch/import/:jobId/progress',
  batchController.getImportProgress
);

// 批量删除路由
router.delete(
  '/test-cases/batch/delete',
  deleteValidation,
  batchController.deleteTestCases
);

export default router;