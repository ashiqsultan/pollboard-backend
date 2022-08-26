import { Request, Response, NextFunction } from 'express';
import isEmpty from 'lodash/isEmpty';
import AppRes from '../types/AppRes';
import * as pollService from '../services/poll';
import * as PollBox from '../models/PollBox';

export const getPollById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const poll = await pollService.get(req.params.id);
    const pollBox = await PollBox.get(req.params.id);
    const response: AppRes = { data: { poll, pollBox }, isError: false };
    res.send(response);
  } catch (error) {
    next(error);
  }
};

export const createPoll = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { name, options } = req.body;
    if (isEmpty(name) || isEmpty(options)) {
      const errRes: AppRes = {
        data: {},
        isError: true,
        errMsg: 'Name and options are required',
      };
      res.status(400).send(errRes);
      return;
    }
    const newPollId = await pollService.create(name, options);
    const poll = await pollService.get(newPollId);
    await PollBox.create(poll);
    const pollBox = await PollBox.get(newPollId);
    const response: AppRes = { data: { poll, pollBox }, isError: false };
    res.send(response);
  } catch (error) {
    next(error);
  }
};
