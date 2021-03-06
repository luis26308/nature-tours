const Tour = require('../models/tourModel');
const APIFeatures = require('../utils/apiFeatures');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

exports.aliasTopTours = (req, res, next) => {
  req.query.limit = '5';
  req.query.sort = '-ratingsAverage,price';
  req.query.fields = 'name,price,ratingsAverage,summary,difficulty';
  next();
};

exports.getAllTours = catchAsync(async (req, res, next) => {
  // EXECUTE QUERY
  const features = new APIFeatures(Tour.find(), req.query)
    .filter()
    .sort()
    .limitFields()
    .paginate();
  const tours = await features.query;

  // SEND RESPONSE
  res.status(200).json({
    status: 'success',
    results: tours.length,
    data: {
      tours,
    },
  });
});

exports.getTour = catchAsync(async (req, res, next) => {
  // Another fix using findByIds seconds parameter
  const tour = await Tour.findById(req.params.id);

  // Per video lecture and a small modification (lecture 117)
  if (!tour) {
    next(new AppError('No tour found with that ID', 404));
    return;
  }

  res.status(200).json({
    status: 'success',
    data: {
      tour,
    },
  });
});

exports.createTour = catchAsync(async (req, res, next) => {
  const newTour = await Tour.create(req.body);

  res.status(201).json({
    status: 'success',
    data: {
      tour: newTour,
    },
  });
});

exports.updateTour = catchAsync(async (req, res, next) => {
  const tour = await Tour.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  if (!tour) {
    next(new AppError('No tour found with that ID', 404));
    return;
  }

  res.status(200).json({
    status: 'success',
    data: {
      tour,
    },
  });
});

exports.deleteTour = catchAsync(async (req, res, next) => {
  const tour = await Tour.findByIdAndDelete(req.params.id);

  if (!tour) {
    next(new AppError('No tour found with that ID', 404));
    return;
  }

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

exports.getTourStats = catchAsync(async (req, res, next) => {
  const stats = await Tour.aggregate([
    {
      $match: { ratingAverage: { $gte: 4.5 } },
    },
    {
      $group: {
        _id: { $toUpper: '$difficulty' },
        numTours: { $sum: 1 },
        numRatings: { $sum: '$ratingsQuantity' },
        avgRating: { $avg: '$ratingAverage' },
        avgPrice: { $avg: '$price' },
        minPrice: { $min: '$price' },
        maxPrice: { $max: '$price' },
      },
    },
    {
      $sort: { avgPrice: 1 },
    },
    // {
    //   $match: { _id: { $ne: 'EASY' } },
    // },
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      stats: stats,
    },
  });
});

exports.getMonthlyPlan = catchAsync(async (req, res, next) => {
  const year = req.params.year * 1;
  const plan = await Tour.aggregate([
    {
      // '$unwind' creates a separate data object for every item in the 'startDates' field
      $unwind: '$startDates',
    },
    {
      // Finds all events between the two given dates stated below
      $match: {
        startDates: {
          $gte: new Date(`${year}-01-01`), // start date; '$gte' = Greater Than or Equal
          $lte: new Date(`${year}-12-31`), // end date; '$lte' = Less Than or Equal
        },
      },
    },
    {
      // '$group' will return an object of all the elements defined with in it
      $group: {
        // '$month' returns the specified month from a date in the format of a number from 1-12
        _id: { $month: '$startDates' },
        // '$sum' will return the count from what was matched from the '$match' from above
        numTourStarts: { $sum: 1 },
        // '$push' will return an array of the names that were matched from the '$match' from above
        tours: { $push: '$name' },
      },
    },
    {
      // '$addFields' creates a new field with the value '_id' under a new key name of 'month'
      $addFields: { month: '$_id' },
    },
    {
      // '$project' can remove fields from view by assigning the value of '0' to them
      $project: {
        _id: 0,
      },
    },
    {
      // '$sort' is ordering from smallest to largest (-1) the field of 'numTourStarts'
      $sort: { numTourStarts: -1 },
    },
    {
      // '$limit' limits the total data objects sent by the value passed to it (12)
      $limit: 12,
    },
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      plan: plan,
    },
  });
});
