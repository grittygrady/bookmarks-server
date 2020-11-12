const express = require('express');
const { v4: uuid } = require('uuid');
const { isWebUri } = require('valid-url');
const logger = require('../logger');
const BookmarksService = require('./bookmarks-service');
const xss = require('xss')

const bookmarksRouter = express.Router();
const bodyParser = express.json();

const serializeBookmark = (bookmark) => ({
  id: bookmark.id,
  title: xss(bookmark.title),
  url: bookmark.url,
  description: xss(bookmark.description),
  rating: Number(bookmark.rating)
})

bookmarksRouter
  .route('/bookmarks')
  .get((req, res, next) => {
    BookmarksService.getAllBookmarks(req.app.get('db'))
      .then(bookmarks => {
        res.json(bookmarks.map(serializeBookmark))
      })
      .catch(next)
  })
  .post(bodyParser, (req, res, next) => {
    for (const field of ['title', 'url', 'rating']) {
      if (!req.body[field]) {
        logger.error(`${field} is required`)
        return res
          .status(400)
          .send(`'${field}' is required`)
      }
    }

    const { title, url, description, rating } = req.body;

    if (isNaN(rating) || rating < 0 || rating > 5) {
      logger.error(`Invalid rating: ${rating}. Must be a number between 0 and 5`)
      return res
        .status(400)
        .send(`'Rating' must be a number between 0 and 5`)
    }

    if (!isWebUri(url)) {
      logger.error(`Invalid url: ${url}`)
      return res
        .status(400)
        .send(`'url' must be a valid url`)
    }

    const newBookmark = {
      title,
      url,
      description,
      rating
    }

    BookmarksService.insertBookmark(
      req.app.get('db'),
      newBookmark
    )
      .then(bookmark => {
        logger.info(`Bookmark with id ${bookmark.id} created.`)
        res
          .status(201)
          .location(`/bookmarks/${bookmark.id}`)
          .json(serializeBookmark(bookmark))
      })
      .catch(next)
  })

  bookmarksRouter
    .route('/bookmarks/:bookmark_id')
    .all((req, res, next) => {
      const { bookmark_id } = req.params
      BookmarksService.getById(
        req.app.get('db'),
        bookmark_id
      )
        .then(bookmark => {
          if (!bookmark) {
            logger.error(`Bookmark with id ${bookmark_id} not found.`)
            return res
              .status(404)
              .json({
                error: { message: `Bookmark not found` }
              })
          }
          res.bookmark = bookmark
          next()
        })
        .catch(next)
    })
    .get((req, res) => {
      res.json(serializeBookmark(res.bookmark))
    })
    .delete((req, res, next) => {
      const { bookmark_id } = req.params

      BookmarksService.deleteBookmark(
        req.app.get('db'),
        bookmark_id
      )
        .then(rowsEffected => {
          logger.info(`Bookmark with id ${bookmark_id} deleted`)
          res.status(204).end()
        })
        .catch(next)
    })

module.exports = bookmarksRouter;