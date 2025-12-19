import busboy from 'busboy';
import path from 'path';

/**
 * Custom middleware to handle multipart form data
 * This is a fallback for cases where multer has issues with certain form submissions
 */
const parseFormData = (req, res, next) => {
    // Skip if not multipart/form-data
    if (!req.headers['content-type']?.includes('multipart/form-data')) {
        return next();
    }
    
    console.log('Using custom form data parser');
    
    const bb = busboy({ headers: req.headers });
    req.body = {};
    req.file = null;
    
    // Handle file fields
    bb.on('file', (name, file, info) => {
        console.log(`Custom parser: File [${name}]: filename: ${info.filename}`);
        
        // Only store the proPic file
        if (name === 'proPic') {
            const chunks = [];
            
            file.on('data', (data) => {
                chunks.push(data);
            });
            
            file.on('end', () => {
                // Create a file object similar to what multer would provide
                req.file = {
                    fieldname: name,
                    originalname: info.filename,
                    encoding: info.encoding,
                    mimetype: info.mimeType,
                    buffer: Buffer.concat(chunks)
                };
                
                console.log(`Custom parser: Finished processing ${name} file`);
            });
        } else {
            // Consume the stream for other files
            file.resume();
        }
    });
    
    // Handle non-file fields
    bb.on('field', (name, val) => {
        console.log(`Custom parser: Field [${name}]: value: ${val}`);
        req.body[name] = val;
    });
    
    bb.on('error', (err) => {
        console.error('Custom parser error:', err);
        next(err);
    });
    
    bb.on('finish', () => {
        console.log('Custom parser: Form parsing completed');
        next();
    });
    
    req.pipe(bb);
};

export default parseFormData; 