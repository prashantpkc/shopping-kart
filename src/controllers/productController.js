let { isValidObjectId } = require("mongoose");
const productModel = require("../models/productModel");
const upload = require("../aws/aws");

const {
  isValidProductName,
  isValidPrice,
  isValidInstallments,
  isValidBody,
  isValidName,
  isValidateSize,
} = require("../validator/validator");

exports.createProduct = async (req, res) => {
  try {
    let data = req.body;

    if (!Object.keys(data).length)
      return res.status(400).send({
        status: false,
        message: "please provide details for create product",
      });

    let {
      installments,
      availableSizes,
      isFreeShipping,
      currencyFormat,
      currencyId,
      price,
      description,
      title,
      style,
    } = data;

    let files = req.files;
    let uploadUrl;

    if (files && files.length > 0) {
      //doubt//
      uploadUrl = await upload.uploadFile(files[0]); //doubt//
    } else {
      return res
        .status(400)
        .send({ status: false, message: "please give files" });
    }

    if (!isValidBody(title))
      return res
        .status(400)
        .send({ status: false, message: "title is required" });
    if (!isValidProductName(title))
      return res
        .status(400)
        .send({ status: false, message: "please provide valid product name" });


    if (!isValidBody(description))
      return res
        .status(400)
        .send({ status: false, message: "description is required" });

    if (!isValidBody(price))
      return res
        .status(400)
        .send({ status: false, message: "price is required" });
    if (!isValidPrice(price))
      return res
        .status(400)
        .send({ status: false, message: "please provide valid price" });


    if (!isValidBody(availableSizes)) return res.status(400).send({ status: false, message: "availableSizes is required" });

    if (availableSizes) {
      var availableSize = availableSizes.toUpperCase().split(",") // Creating an array
      if (availableSize.length === 0) {
        return res.status(400).send({ status: false, message: "please provide the product sizes" })
      }
    }

    let enumArr = ["S", "XS", "M", "X", "L", "XXL", "XL"]
    for (let i = 0; i < availableSize.length; i++) {
      // console.log(enumArr.includes(availableSize[i]), "fghjk");
      if (!enumArr.includes(availableSize[i])) {
        return res.status(400).send({
          status: false,
          message: `Sizes should be ${enumArr} value (with multiple value please give saperated by comma)`,
        })
      }
    }

    if (!isValidBody(currencyFormat))
      return res
        .status(400)
        .send({ status: false, message: "currencyFormat is required" });

    if (currencyFormat != "₹")
      return res
        .status(400)
        .send({ status: false, message: "currency format should be ₹" });

    if (!isValidBody(currencyId))
      return res
        .status(400)
        .send({ status: false, message: "currencyId is required" });

    if (installments) {
      if (!isValidInstallments(installments))
        return res.status(400).send({
          status: false,
          message: "Installment must be an integer",
        });
    }

    const isTitleExist = await productModel.findOne({ title: title });

    if (isTitleExist)
      return res
        .status(400)
        .send({ status: false, message: "title is already registered" });

    let productData = {
      title,
      description,
      price,
      availableSizes: availableSize,
      installments,
      currencyFormat,
      style,
      currencyId,
      isFreeShipping,
      productImage: uploadUrl,
    };

    const createProduct = await productModel.create(productData);

    return res
      .status(201)
      .send({ status: false, message: "Success", data: createProduct });
  } catch (error) {
    console.log(error.message);
    res.status(500).send({ status: false, message: error.message });
  }
};

//===============================getProduct===================================================================//

exports.getProduct = async function (req, res) {
  try {
    let data = req.query;
    let { size, name, priceGreaterThan, priceLessThan, priceSort } = data;

    let obj = { isDeleted: false };

    if (size) {
      if (!isValidBody(size))
        return res
          .status(400)
          .send({ status: false, message: "Please enter Size" });
      if (!isValidateSize(size))
        return res
          .status(400)
          .send({
            status: false,
            message: "only use[S, XS, M, X, L, XXL, XL]",
          });
      obj.availableSizes = size;
    }

    if (name) {
      if (!isValidBody(name)) {
        return res
          .status(400)
          .send({ status: false, message: "Please enter name" });
      }
      if (!isValidName(name)) {
        return res
          .status(400)
          .send({ status: false, message: "Please mention valid name" });
      }
      obj.title = name;
    }

    if (priceGreaterThan) {
      if (!isValidBody(priceGreaterThan))
        return res
          .status(400)
          .send({ status: false, message: "Please enter Price Greater Than" });
      if (!isValidPrice(priceGreaterThan))
        return res
          .status(400)
          .send({ status: false, message: "priceGreaterThan must be number" });
      obj.price = { $gt: priceGreaterThan };
    }

    if (priceLessThan) {
      if (!isValidBody(priceLessThan))
        return res
          .status(400)
          .send({ status: false, message: "Please enter Price Lesser Than" });
      if (!isValidPrice(priceLessThan))
        return res
          .status(400)
          .send({ status: false, message: "priceLessThan must be number" });
      obj.price = { $lt: priceLessThan };
    }

    if (priceGreaterThan && priceLessThan) {
      obj.price = { $gt: priceGreaterThan, $lt: priceLessThan };
    }

    if (priceSort) {
      if (!(priceSort == -1 || priceSort == 1))
        return res
          .status(400)
          .send({
            status: false,
            message:
              "Please Enter '1' for Sort in Ascending Order or '-1' for Sort in Descending Order",
          });
    }

    let getProduct = await productModel.find(obj).sort({ price: priceSort });

    if (getProduct.length == 0)
      return res
        .status(404)
        .send({ status: false, message: "Product Not Found." });

    return res
      .status(200)
      .send({ status: true, message: "Success", data: getProduct });
  } catch (error) {
    return res.status(500).send({ status: false, message: error.message });
  }
};

// GET PRODUCTS BY PRODUCTID

exports.getProductById = async (req, res) => {
  try {
    let productId = req.params.productId;
    if (!isValidObjectId(productId))
      return res
        .status(400)
        .send({ status: false, message: "Invalid productId" });

    let getdata = await productModel.findOne(
      { _id: productId },
      { isDeleted: false }
    );
    if (!getdata)
      return res
        .status(400)
        .send({ status: false, message: "product not found" });

    return res
      .status(200)
      .send({ status: true, message: "Success", data: getdata });
  } catch (error) {
    return res.status(500).send({ status: false, message: error.message });
  }
};


// UPDATE PRODUCT USING PRODUCTID

exports.updateProductDetails = async (req, res) => {
  try {
    let productId = req.params.productId;
    let data = req.body;
    let files = req.files;
    let uploadUrl;

    if (files && files.length > 0) {
      //doubt//
      uploadUrl = await upload.uploadFile(files[0]); //doubt//
    }

    if (Object.keys(data).length == 0) {
      return res
        .status(400)
        .send({
          status: false,
          message: "Please give some details for update",
        });
    }
    if (!isValidObjectId(productId)) {
      return res
        .status(400)
        .send({ status: false, message: "productId is not valid" });
    }

    let {
      availableSizes,
      isFreeShipping,
      currencyFormat,
      currencyId,
      price,
      description,
      title,
      style,
      installments
    } = data;

    //==============================

    if (title) {
      if (!isValidProductName(title))
        return res
          .status(400)
          .send({ status: false, message: "please provide valid title" });
      else {
        title = title.trim();
      }
    }

    if (price) {
      if (!isValidPrice(price))
        return res
          .status(400)
          .send({ status: false, message: "please provide valid price" });
      else {
        price = price.trim();
      }
    }

    if (availableSizes) {
      availableSizes = availableSizes.split(",").map((size) => size.trim().toUpperCase());
      for (let i = 0; i < availableSizes.length; i++) {
        if (
          !["S", "XS", "M", "X", "L", "XXL", "XL"].includes(availableSizes[i])
        )
          return res.status(400).send({
            status: false,
            message: "size can contain only S, XS,M, X, L, XXL, XL",
          });
      }
    }



    if (currencyFormat) {
      if (currencyFormat != "₹")
        return res
          .status(400)
          .send({ status: false, message: "currency format should be ₹" });
    }

    if (installments) {
      if (!isValidInstallments(installments))
        return res.status(400).send({
          status: false,
          message: "Installment must be an integer",
        });
    }



    let productData = {
      title: title,
      description: description,
      price: price,
      availableSizes: availableSizes,
      installments: installments,
      currencyFormat: currencyFormat,
      style: style,
      currencyId: currencyId,
      isFreeShipping: isFreeShipping,
      productImage: uploadUrl,
    };

    let updateData = await productModel.findOneAndUpdate(
      { _id: productId, isDeleted: false },
      productData,
      { new: true }
    );

    if (!updateData) {
      {
        return res
          .status(404)
          .send({ status: false, message: `${productId} Id is not found` });
      }
    }

    return res
      .status(200)
      .send({ status: true, message: "Success", data: updateData });
  } catch (error) {
    return res.status(500).send({ status: false, message: error.message });
  }
};


// DELETE PRODUCT DETAILS

exports.deleteProducts = async (req, res) => {
  try {
    let productId = req.params.productId;

    if (!isValidObjectId(productId)) {
      return res
        .status(400)
        .send({ status: false, message: "productId is not valid" });
    }

    let deleteData = await productModel.findByIdAndUpdate(
      { _id: productId, isDeleted: false },
      { $set: { isDeleted: true, deletedAt: Date.now() } },
      { new: true }
    );
    if (!deleteData) {
      return res.status(400).send({ status: false, message: "data not found" });
    }

    return res
      .status(200)
      .send({ status: true, message: "successfully deleted" });
  } catch (error) {
    return res.status(500).send({ status: false, message: error.message });
  }
};
