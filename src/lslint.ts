// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode'
import {spawn} from 'child_process'
import path from 'path'
import fs from 'fs'
// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed

function generateMatches(payload: string) {
  // if not active, exit
  // split by newline
  let allLines = payload.split(/\n/)
  // array of parsed lines
  return allLines.map((message) => {
    // 使用正则表达式匹配时间戳部分并将其移除
    return message.replace(/^\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}:\d{2} /, '')
  })
}

// parse the data we received
function parseLinting(lslintOutput: string) {
  // call matching function and assign output to errors
  return generateMatches(lslintOutput)
}

// 执行 ls-lint 的函数
function runLsLint(uri: vscode.Uri) {
  const filePath = uri.fsPath
  // 获取 ls-lint 可执行文件的路径
  const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri)
  if (!workspaceFolder) {
    return
  }
  const workspaceRoot = workspaceFolder.uri.fsPath
  const lsLintPath = path.resolve(workspaceRoot, 'node_modules/.bin/ls-lint')
  if (fs.existsSync(lsLintPath)) {
    console.log('lsLintPath 文件存在')
  } else {
    vscode.window.showErrorMessage('请安装 @ls-lint/ls-lint')
  }

  const configPath = path.resolve(workspaceRoot, '.ls-lint.yml')
  if (fs.existsSync(configPath)) {
    console.log('文件存在')
  } else {
    vscode.window.showErrorMessage('请添加配置文件 .ls-lint.yml')
  }
  // 执行 ls-lint 命令
  const lsLintProcess = spawn(lsLintPath, ['--config', configPath, filePath], {
    cwd: workspaceRoot,
    env: process.env
  })

  let stdout = ''
  let stderr = ''

  lsLintProcess.stdout.on('data', (data) => {
    stdout += data.toString()
  })

  lsLintProcess.stderr.on('data', (data) => {
    stderr += data.toString()
  })

  lsLintProcess.on('close', (code) => {
    if (code !== 0) {
      console.error(`ls-lint process exited with code ${code}`)
    }

    if (stderr) {
      const logMessages = parseLinting(stderr)
      console.error(`ls-lint stderr: ${stderr}`)
      const errorMessage = `ls-lint error:\n${logMessages.join('\n')}`
      // vscode.window.showInformationMessage(errorMessage, { modal: true });
      // 显示简短的错误提示
      vscode.window.showErrorMessage(
        'ls-lint encountered multiple errors. Check the output panel for details.'
      )

      // 输出详细信息到输出通道
      const outputChannel = vscode.window.createOutputChannel('ls-lint Errors')
      outputChannel.appendLine(errorMessage)
      outputChannel.show()
    }

    if (stdout) {
      console.log(`ls-lint stdout: ${stdout}`)
      vscode.window.showInformationMessage(`ls-lint output: ${stdout}`)
    }
  })
}

export default function activate(context: vscode.ExtensionContext) {
  const watcher = vscode.workspace.createFileSystemWatcher('**/*')
  // 监听文件创建事件 // 可以监听创建、重命名、复制
  watcher.onDidCreate((uri) => {
    const filePath = uri.fsPath
    let args = [] // initialize holder for our arguments
    args.push(filePath) // last argument is our file path
    runLsLint(uri)
  })

  context.subscriptions.push(watcher)
}
