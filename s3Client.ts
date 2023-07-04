import {
  S3Client as S3SDKClient,
  GetObjectCommand,
  PutObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3'

class S3Client {
  address: string
  keyPrefix: string | null
  bucketName: string
  type: string
  client: S3SDKClient

  constructor(address: string) {
    // if (!process.env.AWS_REGION) {
    //   throw new Error('Please provide AWS_REGION env')
    // }
    const { bucketName, keyPrefix } = this.splitAddress(address)
    this.address = address[address.length - 1] === '/' ? address : address + '/'
    this.keyPrefix = keyPrefix
    this.bucketName = bucketName
    // Set correct region
    this.client = new S3SDKClient({ region: 'eu-west-1' })
    // this.client = new S3SDKClient({ region: process.env.AWS_REGION })
    // Call super()
    this.type = this.constructor.name
  }

  splitAddress = (url: string) => {
    if (!url.startsWith('s3://')) {
      throw new Error(`S3Client address doesn't start with s3:// (${url})`)
    }
    let bucketName, keyPrefix
    // Bucket name
    const addressWithoutS3 = url.split('s3://')[1]
    const splittedAddress = addressWithoutS3.split('/')
    bucketName = splittedAddress[0]
    splittedAddress.shift()
    // Trim last '/'
    if (splittedAddress[splittedAddress.length - 1] == '') {
      splittedAddress.pop()
    }
    // If no keyPrefix
    if (!splittedAddress.length) {
      keyPrefix = null
      return { bucketName, keyPrefix }
    }
    // If keyPrefix
    keyPrefix = splittedAddress.join('/')

    return { bucketName, keyPrefix }
  }

  verify = async () => {
    const command = new ListObjectsV2Command({
      Bucket: this.bucketName,
      MaxKeys: 1,
    })
    await this.client.send(command)
    return true
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
    const objectParams = { Bucket: this.bucketName, Key: this.keyWithPrefix(key) }
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
      Bucket: this.bucketName,
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
