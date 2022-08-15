import { Router } from 'express';
import * as poll from '../controller/poll';

let routes = Router();

// poll routes
routes.post('/poll', poll.createPoll);
routes.get('/poll/:id', poll.getPollById);

export default routes;
