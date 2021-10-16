import express from 'express';
import cors from 'cors';
import 'reflect-metadata';
import { createConnection } from 'typeorm';
import { Product } from './entities/product';
import amqp from 'amqplib/callback_api';

const main = async () => {
  const app = express();

  await createConnection();

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

    // ROUTING
    app.get('/api/v1/products', async (req, res) => {
      const products = await Product.find();
      channel.sendToQueue('admin-get-products', Buffer.from(JSON.stringify(products)));
      res.json(products);
    });

    app.get('/api/v1/products/:id', async (req, res) => {
      const product = await Product.findOne(req.params.id);
      res.json(product);
    });

    app.post('/api/v1/products', async (req, res) => {
      const product = await Product.create(req.body);
      await Product.save(product);
      channel.sendToQueue('admin-post-product', Buffer.from(JSON.stringify(product)));
      res.json(product);
    });

    app.put('/api/v1/products/:id', async (req, res) => {
      const product = await Product.findOne(req.params.id);
      if (!product) return res.json({ err: 'No product with such id' });
      const newProduct = await Product.merge(product, req.body);
      await Product.save(newProduct);
      channel.sendToQueue('admin-put-product', Buffer.from(JSON.stringify(product)));
      return res.json(newProduct);
    });

    app.delete('/api/v1/products/:id', async (req, res) => {
      await Product.delete(req.params.id);
      channel.sendToQueue('admin-delete-product', Buffer.from(JSON.stringify(req.params.id)));
      return res.json({ msg: 'ok', deletedId: req.params.id });
    });

    app.get('/api/v1/products/:id/like', async (req, res) => {
      const product = await Product.findOne(req.params.id);
      if (!product) return res.json({ err: 'No product with such id' });
      product.likes++;
      await Product.save(product);
      return res.json(product);
    });

    app.get('/api/v1/products/:id/unlike', async (req, res) => {
      const product = await Product.findOne(req.params.id);
      if (!product) return res.json({ err: 'No product with such id' });
      product.likes--;
      await Product.save(product);
      return res.json(product);
    });

    const port = 8000;
    app.listen(port, () => console.log(`SERVER: admin - IS RUNNING ON PORT: ${port}`));
  }
};
main();
