import { S3Client as S3SDKClient, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'

class S3Client {
  address: string
  keyPrefix: string | null = null
  type: string
  client: S3SDKClient

  constructor(address: string) {
    const splittedAddress = address.split('/')
    if (splittedAddress.length > 0) {
      this.address = splittedAddress[0]
      splittedAddress.shift()
      this.keyPrefix = splittedAddress.join('/')
    } else {
      this.address = address
    }
    this.type = this.constructor.name
    this.client = new S3SDKClient({ region: 'eu-west-1' })
  }

  keyWithPrefix = (key: string) => {
    if (this.keyPrefix) {
      return [this.keyPrefix, key].join('/')
    }
    return key
  }

  readTextItem = async (key: string) => {
    console.log('s3 read item')
    return this.readItem(key)
  }

  readItem = async (key: string) => {
    console.log('s3 read text item', this.keyWithPrefix(key))
    const objectParams = { Bucket: this.address, Key: this.keyWithPrefix(key) }
    const getCommand = new GetObjectCommand(objectParams)
    const response = await this.client.send(getCommand)
    return response.Body?.transformToString()
    // const textItemString = await response.Body?.transformToString()
    // console.log('bodystring', textItemString)
    // return textItemString
  }

  writeTextItem = async (key: string, fileContent: string) => {
    console.log('s3 write text item')
    return this.writeItem(key, fileContent)
  }

  writeItem = async (key: string, fileContent: Buffer | string) => {
    console.log('s3 write item', this.keyWithPrefix(key), fileContent.length)
    const objectParams = {
      Body: fileContent,
      Bucket: this.address,
      Key: this.keyWithPrefix(key),
    }
    const putCommand = new PutObjectCommand(objectParams)
    return this.client.send(putCommand).then((response) => {
      return response.$metadata.httpStatusCode == 200
    })
  }

  deleteItem = async (key: string) => {
    console.log('s3 delete item', key)
    // if (existsSync(url)) {
    //   return rm(url)
    // }
  }
}

export { S3Client }
