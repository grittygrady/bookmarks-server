const { v4: uuid } = require('uuid');

const bookmarks = [
  {
    id: uuid(),
    title: 'Thinkful',
    url: 'https://www.thinkful.com',
    description: 'Think outside the classroom',
    rating: 5
  },
  {
    id: uuid(),
    title: 'YouTube',
    url: 'https://www.youtube.com',
    description: 'Tutorials and funny videos',
    rating: 4
  },
  {
    id: uuid(),
    title: 'Reddit',
    url: 'https://www.reddit.com',
    description: 'News and cat pictures',
    rating: 3
  }
]

module.exports = { bookmarks }