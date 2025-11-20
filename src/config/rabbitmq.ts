export const getRabbitmqUrl = () =>
  process.env.RABBITMQ_URL || 'amqp://admin:admin123@rabbitmq:5672';
