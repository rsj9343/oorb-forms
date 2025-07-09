import express from 'express';
import XLSX from 'xlsx';
import Response from '../models/Response.js';
import Form from '../models/Form.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Export responses as Excel (only if user owns the form)
router.get('/excel/:formId', authenticateToken, async (req, res) => {
  try {
    console.log('Export route - Excel export for form:', req.params.formId, 'by user:', req.user._id);
    
    const form = await Form.findOne({ 
      _id: req.params.formId, 
      createdBy: req.user._id 
    });
    
    if (!form) {
      return res.status(403).json({ error: 'Form not found or access denied' });
    }

    const responses = await Response.find({ formId: req.params.formId })
      .sort({ submittedAt: -1 });

    if (responses.length === 0) {
      return res.status(404).json({ error: 'No responses found' });
    }

    // Prepare data for Excel
    const excelData = responses.map(response => {
      const row = {
        'Submission Date': response.submittedAt.toLocaleString(),
        'Completion Time (seconds)': response.completionTime || 0
      };

      // Add each field response
      response.responses.forEach(fieldResponse => {
        const value = Array.isArray(fieldResponse.value) 
          ? fieldResponse.value.join(', ') 
          : fieldResponse.value;
        row[fieldResponse.fieldLabel] = value;
      });

      return row;
    });

    // Create workbook
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    
    // Auto-size columns
    const colWidths = Object.keys(excelData[0] || {}).map(key => ({
      wch: Math.max(key.length, 15)
    }));
    worksheet['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Responses');

    // Generate buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // Set headers for download
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${form.title}_responses.xlsx"`);
    
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Export responses as CSV (only if user owns the form)
router.get('/csv/:formId', authenticateToken, async (req, res) => {
  try {
    console.log('Export route - CSV export for form:', req.params.formId, 'by user:', req.user._id);
    
    const form = await Form.findOne({ 
      _id: req.params.formId, 
      createdBy: req.user._id 
    });
    
    if (!form) {
      return res.status(403).json({ error: 'Form not found or access denied' });
    }

    const responses = await Response.find({ formId: req.params.formId })
      .sort({ submittedAt: -1 });

    if (responses.length === 0) {
      return res.status(404).json({ error: 'No responses found' });
    }

    // Get all unique field labels
    const allFields = new Set(['Submission Date', 'Completion Time (seconds)']);
    responses.forEach(response => {
      response.responses.forEach(fieldResponse => {
        allFields.add(fieldResponse.fieldLabel);
      });
    });

    const headers = Array.from(allFields);
    
    // Create CSV content
    let csvContent = headers.map(h => `"${h}"`).join(',') + '\n';
    
    responses.forEach(response => {
      const row = headers.map(header => {
        if (header === 'Submission Date') {
          return `"${response.submittedAt.toLocaleString()}"`;
        }
        if (header === 'Completion Time (seconds)') {
          return response.completionTime || 0;
        }
        
        const fieldResponse = response.responses.find(r => r.fieldLabel === header);
        if (fieldResponse) {
          const value = Array.isArray(fieldResponse.value) 
            ? fieldResponse.value.join(', ') 
            : fieldResponse.value;
          return `"${value || ''}"`;
        }
        return '""';
      });
      
      csvContent += row.join(',') + '\n';
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${form.title}_responses.csv"`);
    res.send(csvContent);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get export summary (only if user owns the form)
router.get('/summary/:formId', authenticateToken, async (req, res) => {
  try {
    console.log('Export route - Summary for form:', req.params.formId, 'by user:', req.user._id);
    
    const form = await Form.findOne({ 
      _id: req.params.formId, 
      createdBy: req.user._id 
    });
    
    if (!form) {
      return res.status(403).json({ error: 'Form not found or access denied' });
    }

    const totalResponses = await Response.countDocuments({ formId: req.params.formId });
    
    res.json({
      formTitle: form.title,
      totalResponses,
      lastUpdated: form.updatedAt,
      availableFormats: ['excel', 'csv']
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;