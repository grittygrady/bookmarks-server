function makeBookmarksArray() {
  return [
    {
      id: 1,
      title: 'First test site',
      url: 'https://www.testsiteone.com',
      description: 'Test site ONE',
      rating: 1
    },
    {
      id: 2,
      title: 'Second test site',
      url: 'https://www.testsitetwo.com',
      description: 'Test site TWO',
      rating: 2
    },
    {
      id: 3,
      title: 'Third test site',
      url: 'https://www.testsitethree.com',
      description: 'Test site THREE',
      rating: 3
    }
  ];
}

module.exports = { makeBookmarksArray }