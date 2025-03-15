import express,{Request,Response} from 'express';
import 'dotenv/config';

const PORT : number = parseInt(process.env.PORT as string,10) || 7072;

const app = express();
const port = PORT; 
app.get('/', (req : Request, res: Response) => {
  res.send('Hello World!');
})
app.post()

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});