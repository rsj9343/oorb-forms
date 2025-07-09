import express from 'express';
import Response from '../models/Response.js';
import Form from '../models/Form.js';
import { authenticateToken } from '../middleware/auth.js';
import { createTransport } from 'nodemailer';

const router = express.Router();

// Email transporter setup
const transporter = createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Submit form response (public - no authentication needed)
router.post('/', async (req, res) => {
  try {
    const { formId, responses, submitterInfo, completionTime } = req.body;
    
    // Verify form exists and is published
    const form = await Form.findById(formId);
    if (!form) {
      return res.status(404).json({ error: 'Form not found' });
    }
    
    if (form.status !== 'published') {
      return res.status(400).json({ error: 'Form is not published' });
    }

    // Create response
    const response = new Response({
      formId,
      responses,
      submitterInfo,
      completionTime,
      submittedAt: new Date()
    });

    await response.save();

    // Update form response count
    form.responses += 1;
    form.completionRate = form.views > 0 ? (form.responses / form.views) * 100 : 0;
    await form.save();

    // Send email notification (if configured)
    if (process.env.EMAIL_USER) {
      try {
        const emailContent = responses.map(r => 
          `${r.fieldLabel}: ${Array.isArray(r.value) ? r.value.join(', ') : r.value}`
        ).join('\n');

        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: process.env.EMAIL_USER, // Send to admin
          subject: `New Response: ${form.title}`,
          text: `New form response received:\n\n${emailContent}\n\nSubmitted at: ${new Date().toLocaleString()}`
        });
      } catch (emailError) {
        console.error('Email notification failed:', emailError);
      }
    }

    res.status(201).json({ 
      message: 'Response submitted successfully',
      responseId: response._id 
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get responses for a form (only if user owns the form)
router.get('/form/:formId', authenticateToken, async (req, res) => {
  try {
    console.log('Responses route - Getting responses for form:', req.params.formId, 'by user:', req.user._id);
    console.log('Responses route - User object:', {
      id: req.user._id,
      email: req.user.email,
      name: req.user.name
    });
    
    // Verify user owns the form
    const form = await Form.findOne({ 
      _id: req.params.formId, 
      createdBy: req.user._id 
    });
    
    console.log('Responses route - Form query result:', form ? 'Found' : 'Not found');
    
    if (!form) {
      console.log('Responses route - Form not found or access denied for form:', req.params.formId);
      return res.status(403).json({ error: 'Form not found or access denied' });
    }

    const { page = 1, limit = 10 } = req.query;
    console.log('Responses route - Pagination params:', { page, limit });
    
    const skip = (page - 1) * limit;

    const responses = await Response.find({ formId: req.params.formId })
      .sort({ submittedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Response.countDocuments({ formId: req.params.formId });
    
    console.log('Responses route - Found', responses.length, 'responses out of', total, 'total');

    res.json({
      responses,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        count: total
      }
    });
  } catch (error) {
    console.error('Responses route - Error getting responses:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single response (only if user owns the form)
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    console.log('Responses route - Getting single response:', req.params.id, 'by user:', req.user._id);
    
    const response = await Response.findById(req.params.id).populate('formId');
    if (!response) {
      return res.status(404).json({ error: 'Response not found' });
    }

    // Verify user owns the form
    const form = await Form.findOne({ 
      _id: response.formId, 
      createdBy: req.user._id 
    });
    
    if (!form) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(response);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete response (only if user owns the form)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    console.log('Responses route - Deleting response:', req.params.id, 'by user:', req.user._id);
    
    const response = await Response.findById(req.params.id);
    if (!response) {
      return res.status(404).json({ error: 'Response not found' });
    }

    // Verify user owns the form
    const form = await Form.findOne({ 
      _id: response.formId, 
      createdBy: req.user._id 
    });
    
    if (!form) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await Response.findByIdAndDelete(req.params.id);

    // Update form response count
    if (form) {
      form.responses = Math.max(0, form.responses - 1);
      form.completionRate = form.views > 0 ? (form.responses / form.views) * 100 : 0;
      await form.save();
    }

    res.json({ message: 'Response deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;