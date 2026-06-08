import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authMiddleware, type AuthRequest } from '../middleware/auth';
import { userService } from '../services/userService';
import logger from '../utils/logger';

const router = Router();

// 确保上传目录存在
const uploadDir = path.join(process.cwd(), 'uploads', 'avatars');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 配置文件上传
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `avatar-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    const allowedExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();

    if (allowedTypes.includes(file.mimetype) && allowedExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('只支持 JPG、PNG、GIF、WEBP 格式的图片'));
    }
  },
});

// 头像上传接口
router.post('/avatar', authMiddleware, upload.single('avatar'), async (req: AuthRequest, res, next) => {
  try {
    if (!req.file) {
      res.status(400).json({
        success: false,
        error: { code: 'BAD_REQUEST', message: '请选择要上传的文件' },
      });
      return;
    }

    const userId = req.user?.userId;
    if (!userId) {
      // 删除已上传的文件
      fs.unlinkSync(req.file.path);
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: '未登录' },
      });
      return;
    }

    // 生成文件访问 URL
    const fileName = path.basename(req.file.path);
    const avatarUrl = `/uploads/avatars/${fileName}`;

    // 更新用户头像
    await userService.update(userId, { avatar: avatarUrl });

    logger.info(`【上传】用户 ${userId} 上传了头像: ${avatarUrl}`);

    res.json({
      success: true,
      data: {
        url: avatarUrl,
        filename: fileName,
      },
      message: '头像上传成功',
    });
  } catch (error: any) {
    // 如果上传失败，删除已保存的文件
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    next(error);
  }
});

export default router;
