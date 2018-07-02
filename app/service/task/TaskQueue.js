/**
 * Tencent is pleased to support the open source community by making Tars available.
 *
 * Copyright (C) 2016THL A29 Limited, a Tencent company. All rights reserved.
 *
 * Licensed under the BSD 3-Clause License (the "License"); you may not use this file except 
 * in compliance with the License. You may obtain a copy of the License at
 *
 * https://opensource.org/licenses/BSD-3-Clause
 *
 * Unless required by applicable law or agreed to in writing, software distributed 
 * under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR 
 * CONDITIONS OF ANY KIND, either express or implied. See the License for the 
 * specific language governing permissions and limitations under the License.
 */
 
const kafka = require('kafka-node');
const kafkaConf = require('../../../config/webConf').kafkaConf;
const logger = require('../../logger');

class MessageQueue {
    constructor (host) {
        this.client = new kafka.Client(host || kafkaConf.zkHost, 'tars-client-id', {
            sessionTimeout : 300,
            spinDelay : 100,
            retries : 2
        });

        this.Producer();
        this.consumer = this.Consumer();
    }

    Producer() {
        this.producer = new kafka.HighLevelProducer(this.client);
        this.producer.on('ready', ()=> {
            logger.info('Producer is ready');
            logger.info('kafkaHost:',kafkaConf.kafkaHost);
            logger.info('zkHost:',kafkaConf.zkHost);
            this.client.topicExists(kafkaConf.topic, ret =>{
                if(ret!==undefined) {
                    this.producer.createTopics(kafkaConf.topic, false, (err) => {
                        err && console.info(err);
                    });
                    //logger.error('kafka topics are not exists!! please create topics');
                }else {
                    logger.info('kafka topics:',kafkaConf.topic);
                }
            });

        });

        this.producer.on('error', err => {
            logger.log('Producer is in error state');
            logger.log(err);
        });
    }

    Consumer() {
        let options = {
            host : kafkaConf.zkHost,
            groupId : 'tars-consumer',
            sessionTimeout : 15000,
            protocol : ['roundrobin'],
            fromOffset : 'earliest',
            autoCommit : true,
            id : 'consumer1'
        };
        this.consumer = new kafka.ConsumerGroup(options, kafkaConf.topic);

        return this.consumer;
    }

    addTask(payloads) {
        payloads.map(payload => {
            payload.topic = payload.topic || kafkaConf.topic[0];
        });
        return new Promise((resolve, reject) => {
            this.producer.send(payloads, (err, data)=> {
                if(err) {
                    logger.info('producer send err:',err);
                    reject(err);
                }else {
                    resolve(data);
                }
            });
        });
    }

    getTaskMessage(succ) {
        let consumer = this.consumer;
        consumer.on('message', (message)=> {
            succ(message);
        });
        consumer.on('error', (err)=> logger.error(err));
    }
}

module.exports = MessageQueue;