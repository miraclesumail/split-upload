import express, { NextFunction, Request, Response } from 'express';
import multer from 'multer'
import cors from 'cors'
import path from 'path'
import fs from 'fs'

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // cb(null, '/uploads')
        cb(null, path.resolve(__dirname, './uploads'))
    },
    filename: function (req, file, cb) {
        cb(null, file.fieldname)
    }
})

const upload = multer({ storage });
const app = express();

app.use(cors())
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.post("/upload", upload.any(), uploadFiles);

app.post('/mergeChunks', mergeChunks)

function uploadFiles(req: Request, res: Response) {
    console.log(req.body, 'req.body');
    res.json({ message: "Successfully uploaded files" });
}

app.listen(8888, function () {
    console.log(`the server is start at port 8888`);
});

async function mergeChunks(req: Request, res: Response) {
    const { size, filename } = req.body;
    await mergeFileChunk(size, filename);
    res.json({ message: "Successfully combined files" });
}

// 通过管道处理流 
// @ts-ignore
const pipeStream = (path, writeStream) => {
    return new Promise(resolve => {
        const readStream = fs.createReadStream(path);
        readStream.pipe(writeStream);
        readStream.on("end", () => {
            fs.unlinkSync(path);
            resolve(true);
        });
    });
}

const mergeFileChunk = async (size = 30000, filename: string) => {
    const chunkDir = path.join(__dirname, './uploads');
    let chunkPaths = fs.readdirSync(chunkDir);

    if (!chunkPaths.length) return;

    // 根据切片下标进行排序，否则直接读取目录的获得的顺序可能会错乱
    chunkPaths = chunkPaths.filter(filePath => filePath.includes(filename)).sort((a, b) => Number(a.split("-")[2]) - Number(b.split("-")[2]));
    console.log("chunkPaths = ", chunkPaths, filename);

    await Promise.all(
        chunkPaths.map((chunkPath, index) =>
            pipeStream(
                path.resolve(chunkDir, chunkPath),
                // 指定位置创建可写流
                fs.createWriteStream(path.join(__dirname, `./uploads/${filename}`), {
                    start: index * size,
                })
            )
        )
    );

    // 合并后删除保存切片的目录
    // fs.rmdirSync(chunkDir);
};

