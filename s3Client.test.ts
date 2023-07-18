import { S3Client } from './s3Client'

describe('verifyAndSplitAddress', () => {
  let originalRegion: string | undefined
  beforeEach(() => {
    originalRegion = process.env.AWS_REGION
    process.env.AWS_REGION = 'mock-region'
  })
  afterEach(() => {
    process.env.AWS_REGION = originalRegion
  })
  describe('only bucket name', () => {
    let client: S3Client
    it('without /', () => {
      client = new S3Client('s3://jvalanen-test3')
    })
    it('with /', () => {
      client = new S3Client('s3://jvalanen-test3/')
    })
    afterEach(() => {
      expect(client.address).toEqual('s3://jvalanen-test3/')
      expect(client.bucketName).toEqual('jvalanen-test3')
      expect(client.keyPrefix).toEqual(null)
      expect(client.type).toEqual('S3Client')
      expect(client.client).toBeDefined()
    })
  })

  describe('with keyPrefix', () => {
    let client: S3Client
    it('one without /', () => {
      client = new S3Client('s3://jvalanen-test3/diograph-stuff')
    })
    it('one with /', () => {
      client = new S3Client('s3://jvalanen-test3/diograph-stuff/')
    })
    afterEach(() => {
      expect(client.address).toEqual('s3://jvalanen-test3/diograph-stuff/')
      expect(client.bucketName).toEqual('jvalanen-test3')
      expect(client.keyPrefix).toEqual('diograph-stuff')
      expect(client.type).toEqual('S3Client')
      expect(client.client).toBeDefined()
    })
  })

  describe('with two or more keyPrefixes', () => {
    let client: S3Client
    it('two with /', () => {
      client = new S3Client('s3://jvalanen-test3/diograph-stuff/two/')
      expect(client.address).toEqual('s3://jvalanen-test3/diograph-stuff/two/')
      expect(client.keyPrefix).toEqual('diograph-stuff/two')
    })
    it('three without /', () => {
      client = new S3Client('s3://jvalanen-test3/diograph-stuff/two/three')
      expect(client.address).toEqual('s3://jvalanen-test3/diograph-stuff/two/three/')
      expect(client.keyPrefix).toEqual('diograph-stuff/two/three')
    })
    afterEach(() => {
      expect(client.bucketName).toEqual('jvalanen-test3')
      expect(client.type).toEqual('S3Client')
      expect(client.client).toBeDefined()
    })
  })
})
