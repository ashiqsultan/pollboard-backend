import { Request, Response, NextFunction } from 'express';
import AppRes from '../types/AppRes';

export const getPollById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const response: AppRes = { data: 'get poll', isError: false };
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
    const response: AppRes = { data: 'poll create', isError: false };
    res.send(response);
  } catch (error) {
    next(error);
  }
};
