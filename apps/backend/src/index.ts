import express,{Request,Response} from 'express';
import 'dotenv/config';
import { TrainModel, GenerateImage, GenerateImagesFromPack } from "common/types";
import { prismaClient } from 'db';

const PORT : number = parseInt(process.env.PORT as string,10) || 7072;
const USER_ID= "1234";
const app = express();
const port = PORT; 
app.get('/', (req : Request, res: Response) => {
  res.send('Hello World!');
})

app.post("/ai/training", async (req: Request, res: Response) => {
  const parsedBody= TrainModel.safeParse(req.body);
  if(!parsedBody.success){
    res.status(411).json({
      message: "Input incorrect"
    })
    return ;
  }
  const data = await prismaClient.model.create({
    data:{
      name: parsedBody.data.name,
      type: parsedBody.data.type,
      age: parsedBody.data.age,
      ethnicity: parsedBody.data.ethinicity,
      bald: parsedBody.data.bald,
      eyeColor: parsedBody.data.eyeColor,
      zipUrl: parsedBody.data.zipUrl,
      userId: USER_ID
      }
    });
    res.status(200).json({
      modelId: data.id
    });
});

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

app.get("/pack/bulk", (req: Request, res: Response) => {
  
});

app.get("/image", (req: Request, res: Response) => {
  
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});