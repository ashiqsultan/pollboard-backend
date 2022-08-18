import { Request, Response, NextFunction } from 'express';
import isEmpty from 'lodash/isEmpty';
import AppRes from '../types/AppRes';
import * as PollBox from '../models/PollBox';

export const updatePollBox = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { option } = req.body;
    const pollId = req.params.id;
    if (isEmpty(option) || isEmpty(pollId)) {
      const errRes: AppRes = {
        data: {},
        isError: true,
        errMsg: 'Option and pollId are required',
      };
      res.status(400).send(errRes);
      return;
    }
    const pollBox = await PollBox.update(pollId, option, 1);
    const response: AppRes = { data: { pollBox }, isError: false };
    res.send(response);
  } catch (error) {
    next(error);
  }
};
