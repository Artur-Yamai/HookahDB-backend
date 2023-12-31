import { Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import db, { CommentModels, RatingModels, TobaccoModels } from "../models";
import ResponseHandler from "../utils/responseHandler";
import { getUserIdFromToken, toDeleteFile } from "../helpers";

export const create = async (req: Request, res: Response): Promise<void> => {
  try {
    const body = req.body;
    const userId = req.headers.userId;
    const fileName: string | undefined = req.file?.filename;

    if (!fileName) {
      const message: string =
        "Фотография не подходят по формату или отсутсвует";
      const logText: string = `userId - ${userId}: ${message}`;
      ResponseHandler.exception(req, res, 403, logText, message);
      return;
    }

    const { name, fabricatorId, description } = body;

    const queryResult = await db.query(TobaccoModels.create(), [
      uuidv4(),
      name,
      fabricatorId,
      description,
      userId,
      `uploads/tobaccos/${fileName}`,
    ]);

    const tobaccoId = queryResult.rows[0].id;

    const message: string = "Новый табак сохранен";
    const logText: string = `tobaccoId - ${tobaccoId} : ${message}`;
    const resBody = { success: true, message, body: { id: tobaccoId } };
    ResponseHandler.success(req, res, 201, logText, resBody);
  } catch (error) {
    ResponseHandler.error(req, res, error, "Табак не был создан");
  }
};

export const getAll = async (req: Request, res: Response): Promise<void> => {
  try {
    const queryResult = await db.query(TobaccoModels.getAll());

    const tobaccos = queryResult.rows;

    ResponseHandler.success(req, res, 201, "Получен список всех табаков", {
      success: true,
      body: tobaccos,
    });
  } catch (error) {
    ResponseHandler.error(req, res, error, "Табаки небыли получены");
  }
};

export const getById = async (req: Request, res: Response): Promise<void> => {
  try {
    const tobaccoId = req.params.id;

    const userId: string | null = getUserIdFromToken(req.headers.authorization);

    const queryResult = await db.query(TobaccoModels.getById(), [
      tobaccoId,
      userId,
    ]);

    const tobacco = queryResult.rows[0];

    if (!tobacco) {
      const respMessage: string = "Данные отстуствуют";
      const logText: string = `tobaccoId - ${tobaccoId} : ${respMessage}`;
      return ResponseHandler.notFound(req, res, logText, respMessage);
    }

    ResponseHandler.success(req, res, 200, `tobaccoId - ${tobaccoId}`, {
      success: true,
      body: tobacco,
    });
  } catch (error) {
    ResponseHandler.error(req, res, error, "Табак не был получен");
  }
};

export const update = async (req: Request, res: Response): Promise<void> => {
  try {
    let oldPhotoUrl: string = "";
    const fileName: string | undefined = req.file?.filename;
    const userId = req.headers.userId;

    const { name, fabricatorId, description, id } = req.body;

    if (fileName) {
      const queryResult = await db.query(TobaccoModels.getOldPhotoUrl(), [id]);
      oldPhotoUrl = queryResult.rows[0].photoUrl;
    }

    const queryResult = await db.query(TobaccoModels.update(), [
      name, // $1
      fabricatorId, // $2
      description, // $3
      fileName ? `uploads/tobaccos/${fileName}` : fileName, // $4
      id, // $5
      userId, // $6
    ]);

    const tobacco = queryResult.rows[0];

    if (!tobacco) {
      const logText = `tobaccoId "${id}" - не найден`;
      const respMessage = "табак не найден";
      return ResponseHandler.notFound(req, res, logText, respMessage);
    }

    if (oldPhotoUrl) toDeleteFile(oldPhotoUrl);

    const logText: string = `userId - ${userId} updated tobaccoId - ${id}`;
    const resBody = {
      success: true,
      message: "Табак успешно обновлен",
      body: tobacco,
    };
    ResponseHandler.success(req, res, 200, logText, resBody);
  } catch (error) {
    ResponseHandler.error(req, res, error, "Табак не был обновлен");
  }
};

export const remove = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.body.id;
    const userId = req.headers.userId;

    const queryResult = await db.query(TobaccoModels.remove(), [id]);

    const tobacco = queryResult.rows[0];

    if (!tobacco) {
      const respMessage = "Такого табака нет";
      const logText = `tobaccoId - ${id} - ${respMessage}`;
      return ResponseHandler.notFound(req, res, logText, respMessage);
    }

    await Promise.all([
      db.query(CommentModels.deleteCommentsForProductId("tobacco"), [
        tobacco.coal_id,
      ]),
      db.query(RatingModels.deleteRatingForProductId("tobacco"), [
        tobacco.tobacco_id,
      ]),
      db.query(TobaccoModels.saveDeletedTobacco(), [
        uuidv4(),
        tobacco.tobacco_id,
        tobacco.tobacco_name,
        tobacco.fabricator_id,
        tobacco.tobacco_description,
        tobacco.photo_url,
        tobacco.user_id,
        tobacco.created_at,
        tobacco.updated_at,
      ]),
    ]);

    const logText = `userId - ${userId} deleted tobaccoId - ${id}`;
    ResponseHandler.forRemoved(req, res, logText);
  } catch (error) {
    ResponseHandler.error(req, res, error, "Табак не был удален");
  }
};

export const getTobaccoComments = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const tobaccoId = req.params.id;

    const queryResult = await db.query(TobaccoModels.getTobaccoComments(), [
      tobaccoId,
    ]);

    const comments = queryResult.rows;

    const message: string = "Получен список комментариев";
    ResponseHandler.success(req, res, 201, ``, {
      success: true,
      message,
      body: comments,
    });
  } catch (error) {
    ResponseHandler.error(
      req,
      res,
      error,
      "Комментарии табака не были получены"
    );
  }
};
