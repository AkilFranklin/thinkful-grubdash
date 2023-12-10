const path = require("path");

// Use the existing order data
const orders = require(path.resolve("src/data/orders-data"));

// Use this function to assigh ID's when necessary
const nextId = require("../utils/nextId");

// TODO: Implement the /orders handlers needed to make the tests pass
function list(req, res) {
  res.json({ data: orders });
}

function create(req, res) {
  const { data: { deliverTo, mobileNumber, status = "pending", dishes } = {} } =
    req.body;
  const newOrder = {
    id: nextId(),
    deliverTo,
    mobileNumber,
    status,
    dishes,
  };
  orders.push(newOrder);
  res.status(201).json({ data: newOrder });
}

function read(req, res) {
  res.json({ data: res.locals.order });
}

function update(req, res, next) {
  const { data: { id, status, deliverTo } = {} } = req.body;
  const order = res.locals.order;
  if (id && id !== order.id) {
    return next({
      status: 400,
      message: `Order id does not match route id. Order: ${id}, Route: ${req.params.orderId}`,
    });
  }

  // Update the order status
  order.deliverTo = deliverTo;
  order.status = status;
  res.json({ data: order });
}

function destroy(req, res, next) {
    if (res.locals.order.status !== "pending") {
        next({
            status: 400,
            message: "An order cannot be deleted unless it is pending."
        })
    }
  const index = orders.findIndex((order) => order.id === res.locals.order.id);
  if (index > -1) {
    orders.splice(index, 1);
  }
  res.sendStatus(204);
}

function bodyDataHas(propertyName) {
  return function (req, res, next) {
    const { data = {} } = req.body;
    if (data[propertyName] && data[propertyName] !== "") {
      return next();
    }
    next({ status: 400, message: `Order must include a ${propertyName}` });
  };
}

function dishesPresent(req, res, next) {
  const { dishes } = req.body.data;
  if (dishes && Array.isArray(dishes) && dishes.length > 0) {
    res.locals.dishes = dishes;
    return next();
  }
  next({
    status: 400,
    message: "Order must include at least one dish",
  });
}

function dishesHaveQuantity(req, res, next) {
  res.locals.dishes.forEach((dish, index) => {
    if (
      !dish.quantity ||
      !Number(dish.quantity) > 0 ||
      !Number.isInteger(dish.quantity)
    ) {
      next({
        status: 400,
        message: `Dish ${index} must have a quantity that is an integer greater than 0`,
      });
    }
  });
  return next();
}

function orderExists(req, res, next) {
  const orderId = req.params.orderId;
  const foundOrder = orders.find((order) => order.id === orderId);
  if (foundOrder) {
    res.locals.order = foundOrder;
    return next();
  }
  next({
    status: 404,
    message: `Order id does not exist: ${orderId}`,
  });
}

function verifyOrderStatusPresent(req, res, next) {
  const order = res.locals.order;
  const validOrders = ["pending", "preparing", "out-for-delivery", "delivered"];
  const orderRequestData = req.body.data;
  if (
    !orderRequestData.status ||
    orderRequestData.status == "" ||
    !validOrders.includes(orderRequestData.status)
  ) {
    next({
      status: 400,
      message:
        "Order must have a status of pending, preparing, out-for-delivery, delivered",
    });
  } else if (order.status === "delivered") {
    next({
      status: 400,
      message: "A delivered order cannot be changed",
    });
  }
  return next();
}

module.exports = {
  list,
  create: [
    bodyDataHas("deliverTo"),
    bodyDataHas("mobileNumber"),
    dishesPresent,
    dishesHaveQuantity,
    create,
  ],
  read: [orderExists, read],
  update: [
    orderExists,
    bodyDataHas("deliverTo"),
    bodyDataHas("mobileNumber"),
    verifyOrderStatusPresent,
    dishesPresent,
    dishesHaveQuantity,
    update,
  ],
  delete: [orderExists, destroy],
};
