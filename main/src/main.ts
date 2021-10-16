import express from 'express';
import cors from 'cors';
import { Product, ProductDocument } from './entities/product';
import { connect, connection } from 'mongoose';
import amqp from 'amqplib/callback_api';

const main = async () => {
  const app = express();

  await connect('mongodb://localhost:27017').then((conn) => console.log(`MONGODB CONNECTED`));

  amqp.connect(
    'amqps://ysgppqen:fowIgHLDtMpHzedu_UlyGdCPkdJsJ3Fm@rat.rmq2.cloudamqp.com/ysgppqen',
    handleAmqpConnection
  );

  function handleAmqpConnection(connErr: any, connection: amqp.Connection) {
    if (connErr) {
      throw connErr;
    }
    console.log(`SERVER: admin AMQP connected successfully`);
    connection.createChannel(handleAmqpChannel);
    process.on('beforeExit', () => {
      console.log('Closing AMQP connection');
      connection.close();
    });
  }

  function handleAmqpChannel(chanErr: any, channel: amqp.Channel) {
    if (chanErr) {
      throw chanErr;
    }
    app.use(
      cors({
        origin: ['http://localhost:3000', 'http://localhost:8080', 'http://localhost:4200'],
      })
    );
    app.use(express.json());

    channel.assertQueue('admin-get-products', { durable: false });
    channel.assertQueue('admin-post-product', { durable: false });
    channel.assertQueue('admin-put-product', { durable: false });
    channel.assertQueue('admin-delete-product', { durable: false });

    channel.consume('admin-get-products', (msg) => {
      console.log(msg?.content.toString());
    });
    channel.consume(
      'admin-post-product',
      async (msg) => {
        const adminProduct: ProductDocument = JSON.parse(msg!.content.toString());
        const product = await Product.create({
          ...adminProduct,
          adminId: String(adminProduct.id),
        });
        console.log('Created product: ', product);
      },
      { noAck: true }
    );
    channel.consume(
      'admin-put-product',
      async (msg) => {
        const adminProduct: ProductDocument = JSON.parse(msg!.content.toString());
        const product = await Product.findOneAndUpdate(
          { adminId: adminProduct.id },
          {
            $set: {
              title: adminProduct.title,
              image: adminProduct.image,
              likes: adminProduct.likes,
            },
          }
        );
        console.log('PUT product: ', product);
      },
      { noAck: true }
    );

    const port = 8001;
    app.listen(port, () => console.log(`SERVER: admin - IS RUNNING ON PORT: ${port}`));
  }
};
main();
