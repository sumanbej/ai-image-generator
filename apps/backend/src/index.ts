import express,{NextFunction, Request,Response} from 'express';
import { fal } from "@fal-ai/client";
import 'dotenv/config';
import { TrainModel, GenerateImage, GenerateImagesFromPack } from "common/types";
import { prismaClient } from "db";
import {S3Client} from "s3-client";
import { FalAIModel } from "../models/FalAIModel";

const PORT : number = parseInt(process.env.PORT as string,10) || 7072;
const falAiModel = new FalAIModel();

const USER_ID= "1234";
const app = express();
const port = PORT; 

//middleware
app.use(express.json());


app.get('/', (req : Request, res: Response) => {
  res.send('Hello World!');
});

app.get("/pre-signed-url", async (req, res) => {
  const key = `models/${Date.now()}_${Math.random()}.zip`;
  const url = S3Client.presign(key, {
    method: "PUT",
    accessKeyId: process.env.S3_ACCESS_KEY,
    secretAccessKey: process.env.S3_SECRET_KEY,
    endpoint: process.env.ENDPOINT,
    bucket: process.env.BUCKET_NAME,
    expiresIn: 60 * 5,
    type: "application/zip",
  });

  res.json({
    url,
    key,
  });
});
//traing model------------------------------------------------
app.post("/ai/training", async (req: Request, res: Response) => {
try{
  const parsedBody= TrainModel.safeParse(req.body);
  if(!parsedBody.success){
    res.status(411).json({
      message: "Input incorrect"
    })
    return ;
}
const { request_id, response_url } = await falAiModel.trainModel(
  parsedBody.data.zipUrl,
  parsedBody.data.name
);

  
  
  const data = await prismaClient.model.create({
    data:{
      name: parsedBody.data.name,
      type: parsedBody.data.type,
      age: parsedBody.data.age,
      ethnicity: parsedBody.data.ethinicity,
      bald: parsedBody.data.bald,
      eyeColor: parsedBody.data.eyeColor,
      zipUrl: parsedBody.data.zipUrl,
      userId: req.userId!,
      falAiRequestId: request_id,
      }
    });
    res.status(200).json({
      modelId: data.id
    });
  }
    catch (error) {
      console.error("Error training model:", error);
      res.status(500).json({  message: "Internal Server Error" });
    }
});
///generate image----------------------------------------------
app.post("/ai/generate", async (req: Request, res: Response) => {
  const parsedBody= GenerateImage.safeParse(req.body);
  if(!parsedBody.success){
    res.status(411).json({
      message: "Input incorrect"
    })
    return ;
  }
  const data = await prismaClient.outputImages.create({
    data: {
      prompt: parsedBody.data.prompt,
      modelId: parsedBody.data.modelId,
      imageUrl: "https://www.google.com",
      userId: USER_ID
    }
    });
    res.status(200).json({
      imageId: data.id
    });
});
//generate image from pack----------------------------------------------
app.post("/pack/generate", async (req: Request, res: Response) => {
  const parsedBody= GenerateImagesFromPack.safeParse(req.body);
  if(!parsedBody.success){
    res.status(411).json({
      message: "Input incorrect"
    })
    return ;
  }
 const prompt = await prismaClient.packPrompts.findMany({
   where: {
     packId: parsedBody.data.packId
   }
});
const images= await prismaClient.outputImages.createManyAndReturn({
  data: prompt.map((p) => ({
    prompt: p.prompt,
    modelId: parsedBody.data.modelId,
    imageUrl: "https://www.google.com",
    userId: USER_ID
  }))
});
res.status(200).json({
  images: images.map((i) => i.id)
});

});
//get all packs------------------------------------------------
app.get("/pack/bulk", async(req: Request, res: Response) => {

  const packs = await prismaClient.packs.findMany({
  
});
res.status(200).json({
  packs
  })
});
//get all images------------------------------------------------
app.get("/image/bulk", async(req: Request, res: Response) => {
  
  const images = req.query.images as string;
  const ids =  req.query.ids as string[];;
  const limit= parseInt(req.query.limit as string) || 10;
  const offset= parseInt(req.query.offset as string) || 0;
  const imagesData = await prismaClient.outputImages.findMany({
    where: {
      id: { in: ids },
      userId: USER_ID
    },
    take: limit,
    skip: offset
  });
  res.status(200).json({
    images: imagesData 
   });
  
});
//create fal-ai images------------------------------------------------
app.post("/fal-ai/webhook/image", async (req: Request, res: Response) => {
  console.log("Image generated:", req.body);
  await prismaClient.outputImages.updateMany({
    where: {
      falAiRequestId: req.body.requestId
    },
    data: {
      imageUrl: req.body.imageUrl,
      status: "Completed"
    }
  });
});

//create fal-ai training model------------------------------------------------
app.post("/fal-ai/webhook/train", async (req: Request, res: Response) => {
  console.log("Model trained:", req.body);
  await prismaClient.model.updateMany({
    where: {
      falAiRequestId: req.body.modelId
    },
    data: {
      trainingStatus: "Generated",
      tensorPath: req.body.tensorPath
    }
  });
});

// Global error handler
app.use((err : Error, req : Request, res : Response, next: NextFunction) => {
  console.error(err);
  res.status(500).json({ message: "Internal Server Error" });
});

app.listen(port, () => { 
  console.log(`server started at http://localhost:${port}`);
}
);
