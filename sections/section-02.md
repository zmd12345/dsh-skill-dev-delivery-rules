## 2. 遵循标准分层架构

- 改动已有项目前，先读懂现有目录结构与分层约定并严格沿用，禁止自创目录或平行的新约定
- 新建项目时，遵循该语言、该框架官方或社区主流的工程结构，按职责分层
  - Web 前端：请求层（api/services）、页面层（pages/views）、组件层（components）、状态层（store）、逻辑复用层（hooks/composables）、工具层（utils）、常量与类型（constants/types）
  - 服务端：路由/控制层（routes/controller/handler）、业务层（service）、数据访问层（repository/dao）、模型层（model/entity）、数据传输对象（dto）、中间件（middleware）
  - 其他语言同理：优先采用官方脚手架生成的结构与主流包组织方式
- 各层职责单一：请求层只负责数据收发、参数序列化与统一错误处理；业务逻辑收敛在业务层；无副作用的通用能力放工具层；组件只负责自身职责范围内的渲染与交互
- 依赖方向只能从上层指向下层，禁止反向依赖与跨层越级调用
