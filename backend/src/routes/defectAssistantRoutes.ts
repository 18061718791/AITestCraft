import { Router } from 'express';
import { processQuery, getSuggestions, exportData } from '../controllers/defectAssistantController';

const router = Router();

router.post('/query', processQuery);

router.get('/suggestions', getSuggestions);

router.post('/export', exportData);

export default router;
