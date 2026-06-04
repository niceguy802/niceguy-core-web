# API 文档 - 本地请求

## 服务地址
D:\a-work-space\code-learning\egg-example

## 请求URL
登录后访问：`http://localhost:7001/api/xxxx`
无需登录后访问：`http://localhost:7001/api/public/xxxx`

## 请求必填参数

header
- `Authorization`：用户身份令牌，格式为 `Bearer <token>`，token 通过登录接口获取。
- `X-Device`: 是否登录都必填，设备标识，格式为 `pc/h5/app`，用于区分不同的设备。

## API文档
### 1. 登录接口
#### 请求URL
`http://localhost:7001/api//public/auth/login`
#### 请求参数
| 参数名 | 类型 | 必填 | 说明 |
| username | string | 是 | 用户名，测试用户名为 `admin`，密码为 `123456`。 | | 
| password | string | 是 | 密码 | 
#### 请求头
| 参数名 | 类型 | 必填 | 说明 |
| X-Device | string | 是 | 设备标识，格式为 `pc/h5/app`，用于区分不同的设备。 |
#### 返回参数
| 参数名 | 类型 | 说明 |
| code | number | 返回码，0表示成功，其他表示失败。 |
| message | string | 返回信息，成功时为 `登录成功`，失败时为 `登录失败`。 |
|success | boolean | 是否成功，true表示成功，false表示失败。 |
| data | object | 返回数据，包含用户信息。 |
| data->accessToken | string | 用户身份令牌，格式为 `<token>`，token 通过登录接口获取。 |
| data->refreshToken | string | 刷新令牌，用于刷新用户身份令牌。 |



### 2.token刷新接口
#### 请求URL
`http://localhost:7001/api/public/auth/refresh`
#### 请求参数
无参数
#### 请求头
| 参数名 | 类型 | 必填 | 说明 |
| X-Device | string | 是 | 设备标识，格式为 `pc/h5/app`，用于区分不同的设备。 |
| Authorization | string | 是 | 用户身份令牌，格式为 `Bearer <token>`，token 通过登录接口获取。 |

#### 返回参数
| 参数名 | 类型 | 说明 |
| code | number | 返回码，0表示成功，其他表示失败。 |
| message | string | 返回信息，成功时为 `刷新成功`，失败时为 `刷新失败`。 |
| success | boolean | 是否成功，true表示成功，false表示失败。 |
| data | string | 返回数据，用户身份令牌，格式为 `<token>`，为新的身份令牌，用于替换旧的身份令牌accessToken。 |

### 3. 获取用户信息接口
#### 请求URL
`http://localhost:7001/api/auth//getUserInfo`
#### 请求参数
| 参数名 | 类型 | 必填 | 说明 |
| username | string | 否 | 用户名 | 
#### 请求头
| 参数名 | 类型 | 必填 | 说明 |
| X-Device | string | 是 | 设备标识，格式为 `pc/h5/app`，用于区分不同的设备。 |
| Authorization | string | 是 | 用户身份令牌，格式为 `Bearer <token>`，token 通过登录接口获取。 |
#### 返回参数
| 参数名 | 类型 | 说明 |
| code | number | 返回码，0表示成功，其他表示失败。 |
| message | string | 返回信息，成功时为 `获取成功`，失败时为 `获取失败`。 |
| success | boolean | 是否成功，true表示成功，false表示失败。 |
| data | object | 返回数据，用户信息。 |

