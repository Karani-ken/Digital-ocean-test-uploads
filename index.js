const express = require('express')
const { S3Client, DeleteObjectCommand } = require('@aws-sdk/client-s3')
const { S3RequestPresigner } = require('@aws-sdk/s3-request-presigner')
const multer = require('multer')
const multerS3 = require('multer-s3')
require('dotenv').config();

const app = express();

//Configure the digitalOcean spaces Client using AWS SDK
app.use(express.urlencoded({ extended: true })) 
app.use(express.json());
const s3Client = new S3Client({
    endpoint: process.env.DO_SPACES_ENDPOINT,
    region: process.env.DO_SPACES_REGION,
    credentials: {
        accessKeyId: process.env.DO_SPACES_KEY,
        secretAccessKey: process.env.DO_SPACES_SECRET,
    },
    forcePathStyle: true,
});

//set up multer to upload to DIgitalOcean spaces using multer-s3
const upload = multer({
    storage: multerS3({
        s3: s3Client,
        bucket: process.env.DO_SPACES_BUCKET,
        acl: 'public-read', //set the file to be readable publicly
        key: (req, file, cb) => {
            cb(null, Date.now().toString() + '-' + file.originalname); //file key (name)
        },
    }),
});

// single file upload endpoint
app.post('/upload', upload.single('image'), (req, res) => {

    console.log('uploading .....')
    if (!req.file) {
        return res.status(400).json("No file uploaded")
    }

    //return the uploaded file URL 
    return res.status(201).json({
        message: ' File uploaded successfully',
        fileUrl: req.file.location, //The Url of the file in the space
    })
})

//delete file endpoint
app.delete('/delete', async (req, res) => {
    const {urlFile} = req.body;
    if (!urlFile) {
        return res.status(400).json({ error: "File name is required" })
    }
    try {
        const fileName = urlFile.split('/').pop();
        console.log(fileName)
        const deleteParams = {
            Bucket: process.env.DO_SPACES_BUCKET,
            Key: fileName,
        }
        const command = new DeleteObjectCommand(deleteParams);
        await s3Client.send(command);
        return res.json({
            message: `File ${fileName} deleted successfully!`
        });
    } catch (error) {
        console.error('Error deleteing file:', error)
        return res.status(500).json({ error: 'Failed to delete file', details: error.message });
    }
})

//start the server 
const port = process.env.PORT || 4000;

app.listen(port, () => {
    console.log(`Server started on port http://localhost:${port}`)
})
