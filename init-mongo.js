// MongoDB initialization script
// Creates the application database and user

db = db.getSiblingDB('chili_db');

// Create collections with schemas
db.createCollection('users', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['email', 'hashed_password', 'created_at'],
      properties: {
        email: {
          bsonType: 'string',
          description: 'User email address'
        },
        hashed_password: {
          bsonType: 'string',
          description: 'Hashed password'
        },
        full_name: {
          bsonType: 'string',
          description: 'User full name'
        },
        is_active: {
          bsonType: 'bool',
          description: 'Whether user is active'
        },
        created_at: {
          bsonType: 'date',
          description: 'Creation timestamp'
        }
      }
    }
  }
});

db.createCollection('samples', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['user_id', 'created_at'],
      properties: {
        user_id: {
          bsonType: 'objectId',
          description: 'Reference to user'
        },
        variety: {
          bsonType: 'string',
          description: 'Chili variety name'
        },
        source_location: {
          bsonType: 'string',
          description: 'Where the sample was collected'
        }
      }
    }
  }
});

db.createCollection('predictions', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['sample_id', 'created_at'],
      properties: {
        sample_id: {
          bsonType: 'objectId',
          description: 'Reference to sample'
        },
        variety_prediction: {
          bsonType: 'string',
          description: 'Predicted variety'
        },
        variety_confidence: {
          bsonType: 'double',
          description: 'Confidence score'
        },
        shu_prediction: {
          bsonType: 'double',
          description: 'Predicted SHU value'
        },
        heat_category: {
          bsonType: 'string',
          enum: ['Mild', 'Medium', 'Hot', 'Extra Hot'],
          description: 'Heat category'
        }
      }
    }
  }
});

db.createCollection('images', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['sample_id', 'file_path', 'created_at'],
      properties: {
        sample_id: {
          bsonType: 'objectId',
          description: 'Reference to sample'
        },
        file_path: {
          bsonType: 'string',
          description: 'Path to image file'
        },
        image_type: {
          bsonType: 'string',
          enum: ['flower', 'fruit', 'plant'],
          description: 'Type of image'
        }
      }
    }
  }
});

// Create indexes
db.users.createIndex({ email: 1 }, { unique: true });
db.samples.createIndex({ user_id: 1 });
db.samples.createIndex({ created_at: -1 });
db.predictions.createIndex({ sample_id: 1 });
db.predictions.createIndex({ created_at: -1 });
db.images.createIndex({ sample_id: 1 });

print('Database initialization complete!');
