import { DynamoDB } from "@aws-sdk/client-dynamodb";

const dynamodb = new DynamoDB({
  region: "us-east-1",
  apiVersion: "2012-08-10",
});

export const handler = (event, context, callback) => {
  console.log("event=", event);

  const type = event.type;

  if (type === "all") {
    // status of ALL parking spots.
    const params = {
      TableName: "gofore-park",
    };
    dynamodb.scan(params, function (err, data) {
      if (err) {
        console.log(err); // an error occurred
        callback(err);
      } else {
        console.log(data.Items); // successful response
        const items = data.Items.map((dataField) => {
          // https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DynamoDBMapper.DataTypes.html
          return {
            parkingSpot: +dataField.parkingSpot.N,
            freeSpot: dataField.VRN.S === "",
          };
        });
        callback(null, items);
      }
    });
  } else {
    // status of a SPECIFIC parkingSpot
    const params = {
      TableName: "gofore-park",
      Key: {
        parkingSpot: {
          N: type,
        },
      },
    };
    dynamodb.getItem(params, function (err, data) {
      if (err) {
        console.log(err); // an error occurred
        callback(err);
      } else {
        console.log(data.Item); // successful response
        callback(null, {
          freeSpot: data.Item.VRN.S === "",
        });
      }
    });
  }
};
