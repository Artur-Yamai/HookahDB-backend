export default {
  create: () => `
    INSERT INTO hookah.tobacco (
      tobacco_id,
      tobacco_name,
      fabricator_id,
      tobacco_description,
      user_id,
      photo_url
    ) VALUES (
      $1, $2, $3, $4, $5, $6
    ) RETURNING tobacco_id AS id
  `,

  getAll: () => `
    SELECT
      tobacco_id AS id,
      photo_url AS "photoUrl",
      tobacco_name AS name,
      fabricator.value AS fabricator,
      fabricator.fabricator_id AS "fabricatorId",
      (
        SELECT
          COALESCE(ROUND(SUM(rating.tobacco.value) / COUNT(rating.tobacco.value), 1), 0)
        FROM rating.tobacco
        WHERE rating.tobacco.tobacco_id = hookah.tobacco.tobacco_id
      ) AS rating
    FROM hookah.tobacco 
      LEFT JOIN hookah.fabricator ON hookah.tobacco.fabricator_id = hookah.fabricator.fabricator_id
    ORDER BY name, rating
  `,

  getById: () => `
    SELECT
      tobacco.tobacco_id AS "id",
      tobacco.tobacco_name AS "name",
      tobacco.fabricator_id AS "fabricatorId",
      fabricator.value AS fabricator,
      tobacco.tobacco_description AS description,
      tobacco.photo_url AS "photoUrl",
      COALESCE(hookah.favorite_tobacco.tobacco_id = $1, false) AS "isFavorite",
      COALESCE((
        SELECT ROUND(SUM(value) / COUNT(value), 1)
        FROM rating.tobacco
        WHERE rating.tobacco.tobacco_id = $1
      ), 0) AS rating,
      (
        SELECT COUNT(value)
        FROM rating.tobacco
        WHERE rating.tobacco.tobacco_id = $1
      ) AS "ratingsQuantity",
      COALESCE((
        SELECT value
        FROM rating.tobacco
        WHERE rating.tobacco.tobacco_id = $1 AND rating.tobacco.user_id = $2
      ), 0) AS "myRating",
      COALESCE($2 = (
        SELECT user_id
        FROM rating.tobacco
        WHERE tobacco_id = $1 AND user_id = $2
      ), false) AS "isRated",
      COALESCE((
        SELECT COUNT(tobacco_id)
        FROM hookah.favorite_tobacco
        WHERE favorite_tobacco.tobacco_id = $1
      ), 0) AS "markQuantity",
      CONCAT(tobacco.created_at::text, 'Z') AS "createdAt",
      CONCAT(tobacco.updated_at::text, 'Z') AS "updatedAt"
    FROM hookah.tobacco
    LEFT JOIN hookah.favorite_tobacco ON (favorite_tobacco.tobacco_id = tobacco.tobacco_id AND favorite_tobacco.user_id = $2)
    LEFT JOIN hookah.fabricator ON fabricator.fabricator_id = tobacco.fabricator_id
    WHERE tobacco.tobacco_id = $1
  `,

  getOldPhotoUrl: () => `
    SELECT photo_url AS "photoUrl"
    FROM hookah.tobacco
    WHERE tobacco_id = $1
  `,

  update: () => `
    UPDATE 
      hookah.tobacco
    SET
      tobacco_name = COALESCE($1, tobacco_name),
      fabricator_id = COALESCE($2, fabricator_id),
      tobacco_description = COALESCE($3, tobacco_description),
      photo_url = COALESCE($4, photo_url),
      updated_at = CURRENT_TIMESTAMP AT TIME ZONE 'UTC'
    WHERE
      tobacco_id = $5
    RETURNING
      user_id AS "userId",
      tobacco_id AS id,
      tobacco_name AS name,
      tobacco.fabricator_id AS "fabricatorId",
      (
        SELECT value
        FROM hookah.fabricator
        WHERE fabricator.fabricator_id = tobacco.fabricator_id
      ) AS fabricator,
      tobacco_description AS description,
      photo_url AS "photoUrl",
      COALESCE($5 = (
        SELECT tobacco_id
        FROM hookah.favorite_tobacco
        WHERE user_id = $6 AND tobacco_id = $5
      ), false) AS "isFavorite",
      COALESCE((
        SELECT ROUND(SUM(value) / COUNT(value), 1)
        FROM rating.tobacco
        WHERE rating.tobacco.tobacco_id = $5
      ), 0) AS rating,
      (
        SELECT COUNT(value)
        FROM rating.tobacco
        WHERE rating.tobacco.tobacco_id = $5
      ) AS "ratingsQuantity",
      COALESCE($6 = (
        SELECT user_id
        FROM rating.tobacco
        WHERE tobacco_id = $5 AND user_id = $6
      ), false) AS "isRated",
      (
        SELECT COUNT(hookah.favorite_tobacco.tobacco_id)
        FROM hookah.favorite_tobacco
        WHERE hookah.favorite_tobacco.tobacco_id = $5
      ) AS "markQuantity",
      CONCAT(created_at::text, 'Z') AS "createdAt",
      CONCAT(updated_at::text, 'Z') AS "updatedAt"
  `,

  remove: () => `
    DELETE FROM hookah.tobacco
    WHERE tobacco_id = $1
    RETURNING *
  `,

  saveDeletedTobacco: () => `
    INSERT INTO deleted.tobacco (
      deleted_id,
      tobacco_id,
      tobacco_name,
      fabricator_id,
      tobacco_description,
      photo_url,
      user_id,
      created_at,
      updated_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9
    )
  `,

  getTobaccoComments: () => `
    SELECT 
    tobacco_comment.comment_id AS "id",
      tobacco_comment.tobacco_id AS "tobaccoId",
      user_data.user.user_id AS "userId",
      user_data.user.login AS login,
      user_data.user.avatar_url AS "userAvatarUrl",
      hookah.tobacco_comment.comment_text AS "text",
      CONCAT(hookah.tobacco_comment.created_at, 'Z') AS "createdAt",
      CONCAT(hookah.tobacco_comment.updated_at, 'Z') AS "updatedAt"
    FROM hookah.tobacco_comment
    INNER JOIN user_data.user ON tobacco_comment.user_id = user_data.user.user_id
    WHERE tobacco_comment.tobacco_id = $1
  `,
};
