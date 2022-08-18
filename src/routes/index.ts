import { Router } from 'express';
import * as poll from '../controller/poll';
import * as pollBox from '../controller/pollBox';

let routes = Router();

// poll routes
routes.post('/poll', poll.createPoll);
routes.get('/poll/:id', poll.getPollById);
// pollBox routes
routes.patch('/poll-box/:id', pollBox.updatePollBox);

export default routes;
