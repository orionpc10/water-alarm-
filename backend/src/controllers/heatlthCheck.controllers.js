import {apiResponse} from '../utils/apiResponse.js'
import {asyncHandler} from '../utils/asyncHandler.js'

const healthCheck = asyncHandler(async (req, res, next) =>{
    return res.status(200).json(new apiResponse(200, "OK", "Health check passed"))
})

export {healthCheck}
