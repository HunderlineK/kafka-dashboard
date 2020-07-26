module.exports = {
    proxy: {
      // with options
      '/api': {
        target: 'http://localhost:5000/',
        rewrite: path => path.replace(/^\/api/, '')
      }
    }
  }
