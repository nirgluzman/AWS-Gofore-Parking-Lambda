import { DynamoDB } from "@aws-sdk/client-dynamodb";
const dynamodb = new DynamoDB({
  region: "us-east-1",
  apiVersion: "2012-08-10",
});

// Update the occupancy of a parking spot
export const handler = (event, context, callback) => {
  console.log("event=", event);

  const type = event.type;
  const vrn = event.vrn;
  let parkingSpot;

  // enter to parking - update an empty parking spot with car info
  if (type === "add") {
    parkingSpot = event.parkingSpot;
    const startTime = new Date();

    const params = {
      TableName: "gofore-park",
      Item: {
        parkingSpot: {
          N: parkingSpot,
        },
        VRN: {
          S: vrn,
        },
        startTime: {
          S: startTime,
        },
      },
      ExpressionAttributeValues: {
        ":empty": {
          S: "",
        },
      },
      ConditionExpression: "VRN = :empty",
    };

    dynamodb.putItem(params, function (err, data) {
      if (err) {
        // an error occurred
        console.log(err);
        callback(
          JSON.stringify({
            httpStatus: 400,
            message: "parking spot is busy!",
          })
        );
      } else {
        // successful response
        callback(null, {
          message: "car parking info has been logged",
        });
      }
    });

    // exit from parking - release the parking spot
  } else if (type === "remove") {
    // find the parkingSpot according to the vrn
    let params = {
      TableName: "gofore-park",
      ExpressionAttributeValues: {
        ":v": {
          S: vrn,
        },
      },
      FilterExpression: "VRN = :v",
    };
    dynamodb.scan(params, function (err, data) {
      if (err || data.Count === 0) {
        // an error occurred
        callback(
          JSON.stringify({
            httpStatus: 400,
            message: "car registration number is not valid!",
          })
        );
      } else {
        // successful response
        parkingSpot = data.Items[0].parkingSpot.N;

        // release the parking spot and calculate the cost
        params = {
          TableName: "gofore-park",
          Item: {
            parkingSpot: {
              N: parkingSpot,
            },
            VRN: {
              S: "",
            },
            startTime: {
              S: "",
            },
          },
          ReturnValues: "ALL_OLD",
          // https://stackoverflow.com/questions/39451505/how-to-return-the-inserted-item-in-dynamodb
        };

        dynamodb.putItem(params, function (err, data) {
          if (err) {
            console.log(err); // an error occurred
            callback(err);
          } else {
            // successful response

            const startTime = new Date(data.Attributes.startTime.S);
            const endTime = new Date();
            const parkTime = (endTime.getTime() - startTime.getTime()) / 60000;

            // calculate parking costs
            let parkCosts;

            if (parkTime < 10) {
              parkCosts = 0;
            } else {
              const ParkTimeHours = Math.ceil(parkTime / 60);
              if (ParkTimeHours <= 3) {
                parkCosts = ParkTimeHours * 0.5;
              } else {
                parkCosts = 1.5 + 0.3 * (ParkTimeHours - 3);
              }
            }

            callback(null, {
              message: "car has been removed",
              vrn: data.Attributes.VRN.S,
              startTime: startTime.toLocaleTimeString("en-GB", {
                timeZone: "Europe/Rome",
              }),
              endTime: endTime.toLocaleTimeString("en-GB", {
                timeZone: "Europe/Rome",
              }),
              parkCosts,
            });
          }
        });
      }
    });

    // wrong path param value
  } else {
    callback(
      JSON.stringify({
        httpStatus: 400,
        message: "wrong path params!",
      })
    );
  }
};
