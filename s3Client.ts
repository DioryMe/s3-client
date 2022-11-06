import { S3Client as S3SDKClient, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'

class S3Client {
  address: string | undefined
  client: S3SDKClient

  constructor(address?: string) {
    this.address = address
    this.client = new S3SDKClient({ region: 'eu-west-1' })
  }

  readTextItem = async (url: string) => {
    console.log('s3 read item')
    return this.readItem(url)
  }

  readItem = async (url: string) => {
    console.log('s3 read text item', url)
    const objectParams = { Bucket: this.address, Key: url }
    const getCommand = new GetObjectCommand(objectParams)
    const response = await this.client.send(getCommand)
    // return response.Body?.transformToString()
    const textItemString = await response.Body?.transformToString()
    // console.log('bodystring', s3BodyString)
    return textItemString
    // return readFile(url, { encoding: 'utf8' })
  }

  writeTextItem = async (url: string, fileContent: string) => {
    console.log('s3 write text item')
    return this.writeItem(url, fileContent)
  }

  writeItem = async (url: string, fileContent: Buffer | string) => {
    console.log('s3 write item', url, fileContent.length)
    // TODO: Remove after roomClient refactor is done ("don't repeat address")
    const splittedUrl = url.split('/')
    splittedUrl.shift()
    const key = splittedUrl.join('/')
    // const key = url

    const objectParams = { Body: fileContent, Bucket: this.address, Key: key }
    const putCommand = new PutObjectCommand(objectParams)
    return this.client.send(putCommand).then((response) => {
      return response.$metadata.httpStatusCode == 200
    })
  }

  deleteItem = async (url: string) => {
    console.log('s3 delete item', url)
    // if (existsSync(url)) {
    //   return rm(url)
    // }
  }
}

export { S3Client }
