import { Router } from 'express';
import { dbService } from '../services/db.service.js';
import { authenticateToken, requireRole } from '../middlewares/auth.middleware.js';

const router = Router();

// GET /api/certifications
router.get('/', async (req, res) => {
  const { categoryId } = req.query;
  const certs = dbService.getCertifications(categoryId as string);
  res.json({ success: true, data: certs });
});

// POST /api/certifications (Admin only)
router.post('/', authenticateToken, requireRole('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  const {
    title,
    code,
    issuer,
    credentialId,
    verificationUrl,
    badgeIcon,
    issueDate,
    expiryDate,
    categoryId,
    skillsValidated,
    syllabusBreakdown,
    isFeatured,
    sortOrder,
  } = req.body;

  if (!title || !issuer || !credentialId || !categoryId) {
    res.status(400).json({ success: false, message: 'Title, issuer, credentialId, and categoryId are required' });
    return;
  }

  const cert = dbService.createCertification({
    title,
    code: code || '',
    issuer,
    credentialId,
    verificationUrl,
    badgeIcon: badgeIcon || 'Award',
    issueDate: issueDate || new Date().toISOString(),
    expiryDate,
    categoryId,
    skillsValidated: Array.isArray(skillsValidated) ? skillsValidated : [],
    syllabusBreakdown: Array.isArray(syllabusBreakdown) ? syllabusBreakdown : [],
    isFeatured: isFeatured !== undefined ? isFeatured : true,
    sortOrder: sortOrder || 0,
  });

  res.status(201).json({ success: true, data: cert, message: 'Certification created successfully' });
});

// PUT /api/certifications/:id (Admin only)
router.put('/:id', authenticateToken, requireRole('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  const updated = dbService.updateCertification(req.params.id, req.body);
  if (!updated) {
    res.status(404).json({ success: false, message: 'Certification not found' });
    return;
  }
  res.json({ success: true, data: updated, message: 'Certification updated successfully' });
});

// DELETE /api/certifications/:id (Admin only)
router.delete('/:id', authenticateToken, requireRole('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  const deleted = dbService.deleteCertification(req.params.id);
  if (!deleted) {
    res.status(404).json({ success: false, message: 'Certification not found' });
    return;
  }
  res.json({ success: true, message: 'Certification deleted successfully' });
});

export default router;
