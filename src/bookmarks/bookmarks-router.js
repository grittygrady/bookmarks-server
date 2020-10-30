const express = require('express');
const { v4: uuid } = require('uuid');
const { isWebUri } = require('valid-url');
const logger = require('../logger');
const store = require('../store');

const bookmarksRouter = express.Router();
const bodyParser = express.json();

bookmarksRouter
  .route('/bookmarks')
  .get((req, res) => {
    res
      .json(store.bookmarks)
  })
  .post(bodyParser, (req, res) => {
    for (const field of ['title', 'url', 'rating']) {
      if (!req.body[field]) {
        logger.error(`${field} is required`)
        return res
          .status(400)
          .send(`${field} is required`)
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
        .send(`${url} is not a valid URL. Please double check your spelling.`)
    }

    const bookmark = {
      id: uuid(),
      title,
      url,
      description,
      rating
    }

    store.bookmarks.push(bookmark)

    logger.info(`Bookmark with id ${bookmark.id} created`)
    res
      .status(201)
      .location(`http://localhost:8000/bookmarks/${bookmark.id}`)
      .json(bookmark)
  })

module.exports = bookmarksRouter;