const fs = require('fs')

const filePath = '/path/to/file'
if (fs.existsSync(filePath)) {
  console.log('文件存在')
} else {
  console.log('文件不存在')
}
