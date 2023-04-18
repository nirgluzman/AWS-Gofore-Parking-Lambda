import { DynamoDB } from "@aws-sdk/client-dynamodb";

const dynamodb = new DynamoDB({
  region: "us-east-1",
  apiVersion: "2012-08-10",
});

export const handler = (event, context, callback) => {
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
          vrn: dataField.VRN.S,
          startTime:
            "" ||
            (dataField.VRN.S !== "" &&
              new Date(dataField.startTime.S).toLocaleTimeString("en-GB", {
                timeZone: "Europe/Rome",
              })),
        };
      });
      callback(null, items);
    }
  });
};
