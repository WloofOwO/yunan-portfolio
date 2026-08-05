"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type ActionName =
  | "idle" | "walk_left" | "walk_right" | "start_left" | "start_right" | "stop_left" | "stop_right"
  | "look" | "glasses" | "bag"
  | "read" | "type" | "point" | "wave" | "celebrate" | "turn_left" | "turn_right";

type Stop = {
  id: string;
  number: string;
  eyebrow: string;
  title: string;
  body: string;
  details: StopDetail[];
  action: ActionName;
  kind: "origin" | "experience" | "skill" | "project" | "ai" | "contact";
  accent: string;
  tint: string;
  link?: string;
};

type StopDetail = {
  label: string;
  title: string;
  body: string;
  points?: { label: string; text: string }[];
  action: ActionName;
  projectScene?: string;
  sourceNote?: string;
};

type BranchId = "education" | "work" | "projects" | "ai";
type Locale = "zh" | "en";
type OutfitName = "casual" | "student" | "formal";
type WardrobePhase = "changing" | null;
type SceneVisual = { scene?: "amsterdam" | "hillside-campus" | "cuhk-shenzhen"; logo: "omtech" | "uva" | "cuhk" | "handshake" };
type SceneTransition = { fromId:string; toId:string; run:number };

const ACTIONS: Record<ActionName, { fps: number; frames: number; loop: boolean }> = {
  idle: { fps: 6, frames: 24, loop: true },
  walk_left: { fps: 24, frames: 64, loop: true }, walk_right: { fps: 24, frames: 64, loop: true },
  start_left: { fps: 16, frames: 8, loop: false }, start_right: { fps: 16, frames: 8, loop: false },
  stop_left: { fps: 16, frames: 8, loop: false }, stop_right: { fps: 16, frames: 8, loop: false },
  look: { fps: 10, frames: 18, loop: false }, glasses: { fps: 10, frames: 18, loop: false },
  bag: { fps: 10, frames: 18, loop: false }, read: { fps: 10, frames: 18, loop: false },
  type: { fps: 10, frames: 18, loop: false }, point: { fps: 10, frames: 18, loop: false },
  wave: { fps: 10, frames: 18, loop: false }, celebrate: { fps: 10, frames: 18, loop: false },
  turn_left: { fps: 10, frames: 18, loop: false }, turn_right: { fps: 10, frames: 18, loop: false },
};

const HUB_STOP: Stop = {
  id:"hub", number:"00", eyebrow:"CHOOSE YOUR PATH", kind:"origin", accent:"#83b9d9", tint:"#e6f1ef",
  title:"吕雨南｜数据、策略与实验驱动的增长运营",
  body:"遵循数据与策略实验驱动的运营方式，围绕消费者与用户理解业务问题。\n\n从量化数据中提取关键信息，并将消费者/用户行为与行为轨迹、评论与咨询、社媒热度与趋势及市场竞争格局等非量化信息，转化为结构化数据点与可分析的量化特征。\n\n整合市场、销售、库存及运营风险等多源信号，构建分析、预测与实验模型，将洞察转化为可验证的策略与经营动作。",
  details:[], action:"wave",
};

const HUB_STOP_EN: Stop = {
  id:"hub", number:"00", eyebrow:"CHOOSE YOUR PATH", kind:"origin", accent:"#83b9d9", tint:"#e6f1ef",
  title:"Yunan Lyu | Data, Strategy & Experiment-Led Growth Operations",
  body:"Data, strategy, and structured experimentation guide how I frame business problems around consumers and users.\n\nI combine quantitative signals with behavior paths, reviews, inquiries, social trends, and competitive dynamics, translating qualitative evidence into structured, analyzable features.\n\nBringing together market, sales, inventory, and risk signals, I build analytical, predictive, and experimental models that turn insight into testable strategy and executable action.",
  details:[], action:"wave",
};

const EDUCATION_STOPS: Stop[] = [
  { id:"uva", number:"E1", eyebrow:"EDUCATION · MASTER", kind:"experience", accent:"#78b8c8", tint:"#e5f2f1", title:"阿姆斯特丹大学", body:"2020–2023｜计算机工程（软件与数据工程），理学硕士", action:"read", details:[
    {label:"2020–2023",title:"计算机工程（软件与数据工程）",body:"计算机工程（软件与数据工程），理学硕士｜阿姆斯特丹大学",action:"read"},
  ]},
  { id:"cuhksz", number:"E2", eyebrow:"EDUCATION · BACHELOR", kind:"experience", accent:"#a7c56a", tint:"#eef3de", title:"香港中文大学（深圳）", body:"2016–2020｜计算机科学与技术，理学学士", action:"glasses", details:[
    {label:"2016–2020",title:"计算机科学与技术",body:"计算机科学与技术，理学学士｜香港中文大学（深圳）",action:"read"},
  ]},
];

const WORK_STOPS: Stop[] = [
  { id:"omtech", number:"W1", eyebrow:"WORK · OMTECH", kind:"experience", accent:"#739bd1", tint:"#e1eaf4", title:"北美市场运营｜OMTech", body:"2025.06–至今", action:"type", details:[
    {label:"01",title:"年化 GMV 超过 1,300 万美元",body:"个人负责年化 GMV 超过 1,300 万美元、月均 GMV 超过 110 万美元的 OMTech 北美独立站运营，覆盖激光设备、UV 打印机、配件及耗材等多品类业务。",action:"celebrate"},
    {label:"02",title:"独立站内容、页面样式及转化实验",body:"负责独立站内容、页面样式及转化实验的策划与迭代，结合活动节奏与业务反馈快速调整测试方案和上线内容。",action:"type"},
    {label:"03",title:"新品及重点产品 GTM",body:"基于产品市场匹配、用户痛点与目标客群，制定新品及重点产品 GTM 计划，明确定位、核心信息、页面、促销节奏及验证指标。",action:"point"},
    {label:"04",title:"竞品追踪与市场情报分析",body:"负责竞品追踪与市场情报分析，持续监控新品、定价、促销、页面策略及社区反馈，并将洞察转化为商品、营销与页面实验建议。",action:"look"},
    {label:"05",title:"销售、库存、DS、利润与超卖风险",body:"分析销售、库存、DS、利润与超卖风险，为重点 SKU 制定补货、调拨、预售及清库存建议。",action:"glasses"},
    {label:"06",title:"大促及季节性活动",body:"策划大促及季节性活动，结合销售、利润、库存与用户需求制定选品、定价、赠品及组合策略。",action:"point"},
  ]},
  { id:"cuhk-research", number:"W2", eyebrow:"WORK · CUHK BUSINESS SCHOOL", kind:"experience", accent:"#a995c8", tint:"#ece5f1", title:"全职研究助理｜香港中文大学商学院", body:"2023.12–2025.06", action:"glasses", details:[
    {label:"01",title:"消费者行为和市场研究",body:"支持消费者行为和市场研究，负责数据采集、分析及在线实验与问卷搭建。",action:"read"},
    {label:"02",title:"社交媒体数据",body:"通过 API 和公开网页采集社交媒体数据，并结合 GPU 完成数据处理与分析，为消费者行为和市场研究提供支持。",action:"type"},
    {label:"03",title:"分析与决策思维",body:"接触国际前沿的市场与消费者行为研究，形成以科学理论、严谨方法和数据验证驱动的分析与决策思维。",action:"glasses"},
    {label:"04",title:"多模态分析方法",body:"运用多模态分析方法，结合文本与图像数据识别品牌、内容与用户表达中的关键信息，支持市场与消费者洞察。",action:"look"},
  ]},
  { id:"mercado-libre", number:"W3", eyebrow:"WORK · MERCADO LIBRE", kind:"experience", accent:"#e7a879", tint:"#f8e7d7", title:"广告数据分析师｜Mercado Libre", body:"2023.05–2023.11｜上海", action:"look", details:[
    {label:"01",title:"广告数据分析",body:"将广告数据分析转化为优化策略，并向业务方进行方案汇报，为商家投放决策提供支持。",action:"point"},
    {label:"02",title:"DID 准实验",body:"设计并落地 DID 准实验，验证广告策略的有效性，为优化决策提供可靠结论。",action:"glasses"},
    {label:"03",title:"季节性、竞争格局和需求变化",body:"分析不同品类的季节性、竞争格局和需求变化，捕捉流行趋势与市场动态，为市场节奏及投放策略提供参考。",action:"look"},
  ]},
];

const PROJECT_STOPS: Stop[] = [
  { id:"product-matrix", number:"P1", eyebrow:"PROJECT · OMTECH", kind:"project", accent:"#d59b62", tint:"#f4e5d7", title:"产品矩阵与经营决策支持", body:"OMTech", action:"glasses", details:[
    {label:"01",title:"六维商品经营诊断",body:"整合 SKU 主数据、销售动销、利润、库存、DS 预测及超卖风险等 6 类经营数据，建立商品健康诊断与品类结构分析框架。",action:"glasses",projectScene:"/project-scenes/product-matrix-anim.webp"},
    {label:"02",title:"产品矩阵与资源配置决策",body:"基于 12 个月历史动销与月度目标结构，支持核心品类资源分配、老品优化、重点 SKU 加推及新品承接决策。",action:"point",projectScene:"/project-scenes/product-matrix-anim.webp"},
  ]},
  { id:"k40-growth", number:"P2", eyebrow:"PROJECT · OMTECH", kind:"project", accent:"#d59b62", tint:"#f4e5d7", title:"重点产品增长与 GTM 优化", body:"OMTech", action:"point", details:[
    {label:"01",title:"市场定位、竞品研究与转化路径",body:"围绕新品及重点产品完成市场定位、竞品研究、用户痛点、页面内容、促销方案与转化路径策划。",action:"look",projectScene:"/project-scenes/k40plus-gtm-anim.webp"},
    {label:"02",title:"K40+ 增长改进与结果验证",body:"以 K40 为例，2025 年 9 月完成增长改进，10–12 月实现 205 台销量。",action:"celebrate",projectScene:"/project-scenes/k40plus-gtm-anim.webp"},
  ]},
  { id:"user-research", number:"P3", eyebrow:"PROJECT · OMTECH", kind:"project", accent:"#d59b62", tint:"#f4e5d7", title:"用户需求洞察与产品定位研究", body:"OMTech", action:"look", details:[
    {label:"01",title:"720 份北美用户问卷",body:"分析 720 份北美用户问卷，识别用户、产品形态与功能偏好。",action:"read",projectScene:"/project-scenes/user-research-anim.webp"},
    {label:"02",title:"用户分层与产品定位证据",body:"其中 69.3% 偏好 Dual-Laser、44.4% 为小企业主，支持新品定位、功能优先级与页面沟通。",action:"look",projectScene:"/project-scenes/user-research-anim.webp"},
  ]},
];

const AI_STOPS: Stop[] = [
  { id:"ai-overview", number:"A1", eyebrow:"AI · OPERATIONS", kind:"ai", accent:"#8c9fd4", tint:"#e9edf5", title:"AI 驱动运营与智能化应用", body:"AI 驱动运营与智能化应用", action:"glasses", details:[
    {label:"01",title:"可复用的 AI 运营工作流",body:"搭建并使用可复用的 AI 运营工作流，将 Shopify 销售、ERP 库存、DS、利润、超卖、广告、用户反馈及竞品信息等多源数据连接到同一分析与决策流程。",action:"type",projectScene:"/ai-project-scenes/01-knowledge-pixel-anim.webp"},
    {label:"02",title:"销售与库存诊断",body:"运用 AI 自动完成销售与库存诊断、需求预测、超卖风险识别、促销选品与定价建议、低动销清理及新品上市规划，将分散数据转化为可执行的运营动作。",action:"glasses",projectScene:"/ai-project-scenes/02-inventory-pixel-anim.webp"},
    {label:"03",title:"客户与市场洞察流程",body:"基于 AI 构建客户与市场洞察流程，梳理用户咨询、评论、社媒内容与竞品动态，提炼用户痛点、购买顾虑、内容机会与产品页面优化方向。",action:"look",projectScene:"/ai-project-scenes/03-customer-pixel-anim.webp"},
    {label:"04",title:"运营看板与项目资料",body:"使用 AI 辅助生成运营看板、预警报告、活动策略表、SKU 分析、产品页策划案及 GTM 项目资料，提高跨团队沟通、决策和落地效率。",action:"point",projectScene:"/ai-project-scenes/06-gtm-pixel-anim.webp"},
  ]},
];

const EDUCATION_STOPS_EN: Stop[] = [
  { id:"uva", number:"E1", eyebrow:"EDUCATION · MASTER", kind:"experience", accent:"#78b8c8", tint:"#e5f2f1", title:"University of Amsterdam", body:"2020–2023 | M.S. in Computer Engineering (Software and Data Engineering)", action:"read", details:[
    {label:"2020–2023",title:"Computer Engineering (Software and Data Engineering)",body:"M.S. in Computer Engineering (Software and Data Engineering) | University of Amsterdam",action:"read"},
  ]},
  { id:"cuhksz", number:"E2", eyebrow:"EDUCATION · BACHELOR", kind:"experience", accent:"#a7c56a", tint:"#eef3de", title:"The Chinese University of Hong Kong, Shenzhen", body:"2016–2020 | B.S. in Computer Science and Technology", action:"glasses", details:[
    {label:"2016–2020",title:"Computer Science and Technology",body:"B.S. in Computer Science and Technology | The Chinese University of Hong Kong, Shenzhen",action:"read"},
  ]},
];

const EDUCATION_OVERVIEW: Stop = {
  id:"uva", number:"E1", eyebrow:"EDUCATION", kind:"experience", accent:"#78b8c8", tint:"#e5f2f1",
  title:"教育背景", body:"2016—2023｜计算机科学、软件与数据工程", action:"read", details:[
    {label:"2020—2023",title:"阿姆斯特丹大学｜计算机工程",body:"计算机工程（软件与数据工程），理学硕士。",action:"read"},
    {label:"2016—2020",title:"香港中文大学（深圳）｜计算机科学与技术",body:"计算机科学与技术，理学学士。",action:"glasses"},
  ],
};

const EDUCATION_OVERVIEW_EN: Stop = {
  id:"uva", number:"E1", eyebrow:"EDUCATION", kind:"experience", accent:"#78b8c8", tint:"#e5f2f1",
  title:"Education", body:"2016—2023 | Computer Science, Software & Data Engineering", action:"read", details:[
    {label:"2020—2023",title:"University of Amsterdam | Computer Engineering",body:"M.S. in Computer Engineering (Software and Data Engineering).",action:"read"},
    {label:"2016—2020",title:"CUHK-Shenzhen | Computer Science and Technology",body:"B.S. in Computer Science and Technology.",action:"glasses"},
  ],
};

const WORK_STOPS_EN: Stop[] = [
  { id:"omtech", number:"W1", eyebrow:"WORK · OMTECH", kind:"experience", accent:"#739bd1", tint:"#e1eaf4", title:"North America Market Operations | OMTech", body:"Jun 2025–Present", action:"type", details:[
    {label:"01",title:"US$13M+ annualized GMV",body:"Independently manage OMTech's North American storefront with over US$13M in annualized GMV and more than US$1.1M in average monthly GMV across laser equipment, UV printers, accessories, and consumables.",action:"celebrate"},
    {label:"02",title:"Storefront content and conversion experiments",body:"Own the planning and iteration of storefront content, page styling, and conversion experiments, rapidly adjusting test plans and live content based on campaign needs and business feedback.",action:"type"},
    {label:"03",title:"New and priority-product GTM",body:"Develop GTM plans for new and priority products based on product-market fit, customer pain points, and target segments, defining positioning, core messaging, page strategy, promotional cadence, and validation metrics.",action:"point"},
    {label:"04",title:"Competitor and market intelligence",body:"Track competitors and market activity across launches, pricing, promotions, page strategy, and community feedback, translating insights into product, marketing, and page-experiment recommendations.",action:"look"},
    {label:"05",title:"Sales, inventory and oversell risk",body:"Analyze sales, inventory, demand forecasts, profitability, and oversell risk, recommending replenishment, transfers, presales, and clearance actions for priority SKUs.",action:"glasses"},
    {label:"06",title:"Promotional and seasonal campaigns",body:"Plan major promotional and seasonal campaigns, developing product selection, pricing, gift, and bundle strategies from sales, profitability, inventory, and customer demand.",action:"point"},
  ]},
  { id:"cuhk-research", number:"W2", eyebrow:"WORK · CUHK BUSINESS SCHOOL", kind:"experience", accent:"#a995c8", tint:"#ece5f1", title:"Full-time Research Assistant | CUHK Business School", body:"Dec 2023–Jun 2025", action:"glasses", details:[
    {label:"01",title:"Consumer behavior and market research",body:"Supported consumer behavior and market research through data collection, analysis, and online experiment and survey development.",action:"read"},
    {label:"02",title:"Social-media data collection",body:"Collected social-media data from APIs and public webpages, and used GPU-accelerated processing and analysis to support consumer behavior and market research.",action:"type"},
    {label:"03",title:"Research-driven decision making",body:"Engaged with frontier research in marketing and consumer behavior, developing an analytical and decision-making approach grounded in scientific theory, rigorous methods, and data validation.",action:"glasses"},
    {label:"04",title:"Multimodal analysis",body:"Used multimodal analysis to identify key brand, content, and consumer signals from text and visual data, supporting market and consumer insights.",action:"look"},
  ]},
  { id:"mercado-libre", number:"W3", eyebrow:"WORK · MERCADO LIBRE", kind:"experience", accent:"#e7a879", tint:"#f8e7d7", title:"Advertising Data Analyst | Mercado Libre", body:"May 2023–Nov 2023 | Shanghai", action:"look", details:[
    {label:"01",title:"Advertising data analysis",body:"Translated advertising data analysis into optimization strategies and presented recommendations to business stakeholders to support merchants' campaign decisions.",action:"point"},
    {label:"02",title:"Difference-in-differences experiments",body:"Designed and implemented difference-in-differences (DID) experiments to validate advertising strategy effectiveness and provide evidence for optimization decisions.",action:"glasses"},
    {label:"03",title:"Seasonality and competitive dynamics",body:"Analyzed seasonality, competitive dynamics, and demand shifts across product categories to identify emerging trends and market dynamics, informing market timing and advertising strategy.",action:"look"},
  ]},
];

const PROJECT_STOPS_EN: Stop[] = [
  { id:"product-matrix", number:"P1", eyebrow:"PROJECT · OMTECH", kind:"project", accent:"#d59b62", tint:"#f4e5d7", title:"Product Matrix & Operating Decision Support", body:"OMTech", action:"glasses", details:[
    {label:"01",title:"Six-dimensional product diagnosis",body:"Integrated SKU master data, sales velocity, profit, inventory, demand forecasts, and oversell risk into a product-health and category-structure framework.",action:"glasses",projectScene:"/project-scenes/product-matrix-anim.webp"},
    {label:"02",title:"Product-matrix resource decisions",body:"Used 12 months of historical sales velocity and monthly target structures to support category resource allocation, legacy-product optimization, priority-SKU investment, and new-product transition decisions.",action:"point",projectScene:"/project-scenes/product-matrix-anim.webp"},
  ]},
  { id:"k40-growth", number:"P2", eyebrow:"PROJECT · OMTECH", kind:"project", accent:"#d59b62", tint:"#f4e5d7", title:"Priority Product Growth & GTM Optimization", body:"OMTech", action:"point", details:[
    {label:"01",title:"Positioning, competitive research and conversion path",body:"Planned positioning, competitive research, customer pain points, page content, promotions, and conversion paths for new and priority products.",action:"look",projectScene:"/project-scenes/k40plus-gtm-anim.webp"},
    {label:"02",title:"K40+ growth improvement and validation",body:"Completed the K40 growth improvement in September 2025, followed by 205 units sold from October through December.",action:"celebrate",projectScene:"/project-scenes/k40plus-gtm-anim.webp"},
  ]},
  { id:"user-research", number:"P3", eyebrow:"PROJECT · OMTECH", kind:"project", accent:"#d59b62", tint:"#f4e5d7", title:"Customer Insight & Product Positioning Research", body:"OMTech", action:"look", details:[
    {label:"01",title:"720 North American survey responses",body:"Analyzed 720 North American survey responses to identify customer profiles, preferred product formats, and feature priorities.",action:"read",projectScene:"/project-scenes/user-research-anim.webp"},
    {label:"02",title:"Segment evidence for product positioning",body:"Found that 69.3% preferred Dual-Laser solutions and 44.4% were small-business owners, informing positioning, feature priorities, and page communication.",action:"look",projectScene:"/project-scenes/user-research-anim.webp"},
  ]},
];

const AI_STOPS_EN: Stop[] = [
  { id:"ai-overview", number:"A1", eyebrow:"AI · OPERATIONS", kind:"ai", accent:"#8c9fd4", tint:"#e9edf5", title:"AI-Driven Operations & Intelligent Applications", body:"AI-driven operations and intelligent applications", action:"glasses", details:[
    {label:"01",title:"Reusable AI operations workflow",body:"Built and used reusable AI operations workflows that connect Shopify sales, ERP inventory, demand forecasts, profit, oversells, advertising, customer feedback, and competitor information in one analysis and decision process.",action:"type",projectScene:"/ai-project-scenes/01-knowledge-pixel-anim.webp"},
    {label:"02",title:"Sales and inventory diagnosis",body:"Used AI to automate sales and inventory diagnosis, demand forecasting, oversell-risk identification, promotional product and pricing recommendations, slow-moving inventory clearance, and new-product launch planning, converting fragmented data into executable operating actions.",action:"glasses",projectScene:"/ai-project-scenes/02-inventory-pixel-anim.webp"},
    {label:"03",title:"Customer and market insight workflow",body:"Built AI-assisted customer and market insight workflows across inquiries, reviews, social content, and competitor activity to identify customer pain points, purchase concerns, content opportunities, and product-page optimization directions.",action:"look",projectScene:"/ai-project-scenes/03-customer-pixel-anim.webp"},
    {label:"04",title:"Dashboards and project materials",body:"Used AI to support operations dashboards, alert reports, campaign strategy tables, SKU analysis, product-page plans, and GTM project materials, improving cross-functional communication, decision making, and execution efficiency.",action:"point",projectScene:"/ai-project-scenes/06-gtm-pixel-anim.webp"},
  ]},
];

const BRANCHES: Record<BranchId, Stop[]> = {
  education: [EDUCATION_OVERVIEW],
  work: WORK_STOPS,
  projects: PROJECT_STOPS,
  ai: AI_STOPS,
};

const BRANCHES_EN: Record<BranchId, Stop[]> = {
  education: [EDUCATION_OVERVIEW_EN],
  work: WORK_STOPS_EN,
  projects: PROJECT_STOPS_EN,
  ai: AI_STOPS_EN,
};

const BRANCH_OPTIONS: {id:BranchId; index:string; title:string; subtitle:string; action:ActionName}[] = [
  {id:"education",index:"01",title:"教育背景",subtitle:"EDUCATION",action:"read"},
  {id:"work",index:"02",title:"工作背景",subtitle:"WORK EXPERIENCE",action:"type"},
  {id:"projects",index:"03",title:"项目经验",subtitle:"SELECTED PROJECTS",action:"point"},
  {id:"ai",index:"04",title:"AI 能力",subtitle:"AI OPERATIONS",action:"glasses"},
];

const BRANCH_OPTIONS_EN: typeof BRANCH_OPTIONS = [
  {id:"education",index:"01",title:"Education",subtitle:"EDUCATION",action:"read"},
  {id:"work",index:"02",title:"Professional Experience",subtitle:"WORK EXPERIENCE",action:"type"},
  {id:"projects",index:"03",title:"Selected Projects",subtitle:"SELECTED PROJECTS",action:"point"},
  {id:"ai",index:"04",title:"AI Operations",subtitle:"AI OPERATIONS",action:"glasses"},
];

const UI_COPY = {
  zh:{entryEyebrow:"交互式个人履历",tagline:"电商 · 增长 · 数据 · AI",start:"开始探索",loading:"加载中",entryHint:"选择一条路径，浏览每段经历",workspace:"个人履历",back:"回到路径选择",choose:"选择经历模块",enter:"进入探索 →",scene:"场景",currentScene:"当前位置",sceneCount:"场景进度",exploreProgress:"探索进度",explore:"探索",complete:"场景已完成",nextScene:"下一场景",detail:"经历详情",expand:"展开详情",collapse:"收起详情",previous:"← 上一项",next:"下一项 →",download:"下载中文简历",downloadMeta:"DOCX · 中文",route:"路线"},
  en:{entryEyebrow:"AN INTERACTIVE PERSONAL JOURNEY",tagline:"Ecommerce · Growth · Data · AI",start:"START JOURNEY",loading:"LOADING WORLD",entryHint:"Choose a path and explore each scene",workspace:"PERSONAL WORKSPACE",back:"Return to path selection",choose:"Choose an experience module",enter:"Explore →",scene:"SCENE",currentScene:"CURRENT SCENE",sceneCount:"SCENE COUNT",exploreProgress:"EXPLORE",explore:"EXPLORE",complete:"SCENE COMPLETE",nextScene:"NEXT SCENE",detail:"EXPLORE",expand:"EXPAND",collapse:"COLLAPSE",previous:"← PREV",next:"NEXT →",download:"Download English Resume",downloadMeta:"DOCX · EN",route:"JOURNEY"},
} as const;

const clamp = (value:number, min=0, max=1) => Math.min(max, Math.max(min, value));
const mixHex = (from:string, to:string, amount:number) => {
  const read = (color:string, offset:number) => Number.parseInt(color.slice(offset, offset + 2), 16);
  const channel = (a:number,b:number) => Math.round(a + (b-a)*amount).toString(16).padStart(2,"0");
  return `#${channel(read(from,1),read(to,1))}${channel(read(from,3),read(to,3))}${channel(read(from,5),read(to,5))}`;
};
const OUTFITS:OutfitName[] = ["casual","student","formal"];
const BRANCH_OUTFIT:Record<BranchId,OutfitName> = {education:"student",work:"formal",projects:"casual",ai:"casual"};
const WARDROBE_SWITCH_SECONDS=1.2;
// Smoke variant: 48 generated APNG frames at 50 ms. Switch while dense smoke
// hides the character, then stop before the infinite loop returns to frame 0.
const WARDROBE_DURATION_SECONDS=2.36;
const ACTION_BLEND_SECONDS=.12;
const SCENE_TRANSITION_SECONDS=2.6;
const animationPath = (outfit:OutfitName,action:ActionName) => `/avatar-v3/${outfit}/animated/${action}.png?v=36`;
const staticAvatarPath = (outfit:OutfitName) => `/avatar-v3/${outfit}/static/idle.png?v=1`;
const wardrobeTransitionPath = (source:OutfitName,target:OutfitName) => `/avatar-smoke/transitions/smoke_${source}_to_${target}.png?v=3`;
const STOP_VISUALS:Record<string,SceneVisual> = {
  uva:{scene:"amsterdam",logo:"uva"},
  cuhksz:{scene:"cuhk-shenzhen",logo:"cuhk"},
  omtech:{logo:"omtech"},
  "cuhk-research":{scene:"hillside-campus",logo:"cuhk"},
  "mercado-libre":{logo:"handshake"},
  "product-matrix":{logo:"omtech"},
  "k40-growth":{logo:"omtech"},
  "user-research":{logo:"omtech"},
  "ai-overview":{logo:"omtech"},
};
const SCENE_ASSET_VERSION = "transparent-sky-20260730";
const SCENE_TRANSITION_VERSION = "pixel-bridge-20260803-fixed-logo";
const SCENE_TRANSITION_PAIRS = [
  ["uva","cuhksz"],["cuhksz","uva"],
  ["omtech","cuhk-research"],["cuhk-research","omtech"],
  ["cuhk-research","mercado-libre"],["mercado-libre","cuhk-research"],
] as const;
const sceneDayPath = (visual:SceneVisual) => visual.scene ? `/scene-assets/${visual.scene}/day.png?v=${SCENE_ASSET_VERSION}` : null;
const sceneLogoPath = (visual:SceneVisual) => `/scene-assets/logos/${visual.logo}.png?v=${SCENE_ASSET_VERSION}`;
const sceneTransitionPath = (fromId:string,toId:string) => `/scene-assets/transitions/${fromId}-to-${toId}.webp?v=${SCENE_TRANSITION_VERSION}`;

const titlePhrases = (title:string) => title.split(/\s*[｜|]\s*/).filter(Boolean);

function SemanticTitle({title}:{title:string}) {
  const phrases=titlePhrases(title);
  return <h1 className={`semantic-title ${phrases.length>1?"has-secondary":""}`}>
    {phrases.map((phrase,index)=><span className={index===0?"title-primary":"title-secondary"} key={`${phrase}-${index}`}>{phrase}</span>)}
  </h1>;
}

function StoryBody({body}:{body:string}) {
  const paragraphs=body.split(/\n{2,}/).map(paragraph=>paragraph.trim()).filter(Boolean);
  return <div className={`story-body ${paragraphs.length>1?"is-structured":""}`}>
    {paragraphs.map((paragraph,index)=><p key={`${index}-${paragraph.slice(0,12)}`}>{paragraph}</p>)}
  </div>;
}

export function AvatarExperience({uiVariant="original"}:{uiVariant?:"original"|"pixel"|"tundra"}={}) {
  const rootRef = useRef<HTMLElement>(null);
  const worldCanvasRef = useRef<HTMLCanvasElement>(null);
  const avatarElementRef = useRef<HTMLImageElement>(null);
  const wardrobeElementRef = useRef<HTMLImageElement>(null);
  const detailSceneTimerRef = useRef<ReturnType<typeof setTimeout>|null>(null);
  const backPointerRef = useRef<{x:number;y:number;moved:boolean}|null>(null);
  const storyCardRefs = useRef<(HTMLElement|null)[]>([]);
  const imagesRef = useRef<Record<string,HTMLImageElement>>({});
  const rafRef = useRef(0);
  const activeRef = useRef(0);
  const readyRef = useRef(false);
  const reducedRef = useRef(false);
  const outfitRef = useRef<OutfitName>("casual");
  const wardrobeRef = useRef<{active:boolean;source:OutfitName;target:OutfitName;branch:BranchId|null;elapsed:number;switched:boolean}>({active:false,source:"casual",target:"casual",branch:null,elapsed:0,switched:false});
  const stopsRef = useRef<Stop[]>([HUB_STOP]);
  const motionRef = useRef({ current:0,target:0,travelFrom:0,travelElapsed:0,sceneToId:"hub",velocity:0,previous:0,lastTime:0,stillFor:0,moving:false,action:"idle" as ActionName,frame:0,frameTime:0,queue:[] as ActionName[],lastDirection:1,lastInputAt:0,wheelAccum:0,lastWheelAt:0,previousAction:"idle" as ActionName,previousFrame:0,transitionTime:0 });

  const [activeIndex,setActiveIndex] = useState(0);
  const [ready,setReady] = useState(false);
  const [entered,setEntered] = useState(false);
  const [sessionReady,setSessionReady] = useState(false);
  const [coverHovered,setCoverHovered] = useState(false);
  const [locale,setLocale] = useState<Locale>("zh");
  const [actionLabel,setActionLabel] = useState<ActionName>("idle");
  const [activeHotspot,setActiveHotspot] = useState<number|null>(null);
  const [detailExpanded,setDetailExpanded] = useState(false);
  const [explored,setExplored] = useState<Record<string,number[]>>({});
  const [selectedBranch,setSelectedBranch] = useState<BranchId|null>(null);
  const [outfit,setOutfit] = useState<OutfitName>("casual");
  const [wardrobePhase,setWardrobePhase] = useState<WardrobePhase>(null);
  const [wardrobeMedia,setWardrobeMedia] = useState({src:"",run:0});
  const [visualStopId,setVisualStopId] = useState("hub");
  const [sceneTransition,setSceneTransition] = useState<SceneTransition|null>(null);
  const ui=UI_COPY[locale];
  const localizedBranches=locale==="en"?BRANCHES_EN:BRANCHES;
  const localizedBranchOptions=locale==="en"?BRANCH_OPTIONS_EN:BRANCH_OPTIONS;
  const journeyStops = useMemo(()=>selectedBranch ? localizedBranches[selectedBranch] : [locale==="en"?HUB_STOP_EN:HUB_STOP],[locale,localizedBranches,selectedBranch]);
  const activeStop = journeyStops[Math.min(activeIndex,journeyStops.length-1)];
  const exploredCount = explored[activeStop.id]?.length ?? 0;
  const activeDetail = activeHotspot === null ? null : activeStop.details[activeHotspot];
  useEffect(()=>{setDetailExpanded(false);},[activeHotspot,activeIndex,selectedBranch]);
  useEffect(()=>{
    const hoverCover=new Image();
    hoverCover.src="/cover-assets/cover-complete-hover-v12-black-hd.png";
  },[]);

  const playAction = useCallback((...requested:ActionName[]) => {
    const motion = motionRef.current;
    const actions=requested.filter(action=>Boolean(action&&imagesRef.current[animationPath(outfitRef.current,action)]));
    if(!actions.length)return;
    if(motion.action==="idle"&&motion.queue.length===0){
      const [first,...rest]=actions;
      motion.previousAction=motion.action;motion.previousFrame=motion.frame;motion.transitionTime=ACTION_BLEND_SECONDS;
      motion.action=first;motion.frame=0;motion.frameTime=0;motion.queue=rest;
      setActionLabel(first);return;
    }
    for(const action of actions){
      const last=motion.queue[motion.queue.length-1]??motion.action;
      if(action!==last&&!motion.queue.includes(action)&&motion.queue.length<4)motion.queue.push(action);
    }
  },[]);

  const forceAction = useCallback((action:ActionName,...queue:ActionName[]) => {
    const motion=motionRef.current;
    motion.previousAction=motion.action;motion.previousFrame=motion.frame;motion.transitionTime=ACTION_BLEND_SECONDS;
    motion.action=action;motion.frame=0;motion.frameTime=0;motion.queue=queue;
    setActionLabel(action);
  },[]);

  const goTo = useCallback((index:number) => {
    const count=stopsRef.current.length;
    const bounded = clamp(index,0,count-1);
    const currentTarget=Math.round(motionRef.current.target*(count-1));
    if(bounded===currentTarget)return;
    if(Math.abs(motionRef.current.target-motionRef.current.current)>.0005||motionRef.current.moving)return;
    motionRef.current.target = count>1 ? bounded/(count-1) : 0;
    const direction=bounded>currentTarget?1:-1;
    const motion=motionRef.current;
    motion.lastDirection=direction;
    const fromId=stopsRef.current[currentTarget].id,toId=stopsRef.current[bounded].id;
    motion.travelFrom=motion.current;motion.travelElapsed=0;motion.sceneToId=toId;motion.moving=true;
    const hasGeneratedTransition=SCENE_TRANSITION_PAIRS.some(([from,to])=>from===fromId&&to===toId);
    setSceneTransition(hasGeneratedTransition?{fromId,toId,run:performance.now()}:null);
    forceAction(stopsRef.current[bounded].action);
    setActiveHotspot(null);
  },[forceAction]);

  const selectStopFromList = useCallback((index:number) => {
    const count=stopsRef.current.length;
    const bounded=clamp(index,0,count-1);
    const currentIndex=Math.round(motionRef.current.target*Math.max(1,count-1));
    if(bounded===currentIndex||wardrobeRef.current.active)return;
    const motion=motionRef.current;
    const fromId=stopsRef.current[currentIndex].id;
    const toId=stopsRef.current[bounded].id;
    const target=count>1?bounded/(count-1):0;
    motion.current=target;motion.target=target;motion.previous=target;motion.velocity=0;
    motion.travelElapsed=0;motion.moving=false;motion.sceneToId=toId;motion.queue=[];
    activeRef.current=bounded;setActiveIndex(bounded);setActiveHotspot(null);
    forceAction(stopsRef.current[bounded].action);
    if(detailSceneTimerRef.current)clearTimeout(detailSceneTimerRef.current);
    const hasGeneratedTransition=SCENE_TRANSITION_PAIRS.some(([from,to])=>from===fromId&&to===toId);
    if(hasGeneratedTransition){
      setSceneTransition({fromId,toId,run:performance.now()});
      detailSceneTimerRef.current=setTimeout(()=>{
        setVisualStopId(toId);setSceneTransition(null);detailSceneTimerRef.current=null;
      },SCENE_TRANSITION_SECONDS*1000);
    }else{
      setVisualStopId(toId);setSceneTransition(null);
    }
  },[forceAction]);

  const selectDetail = useCallback((detailIndex:number,detail:StopDetail) => {
    setActiveHotspot(detailIndex);
    setExplored(current=>({...current,[activeStop.id]:Array.from(new Set([...(current[activeStop.id]??[]),detailIndex]))}));
    if(motionRef.current.action==="idle")forceAction(detail.action);
    if(selectedBranch!=="education")return;
    const targetId=detailIndex===0?"uva":"cuhksz";
    const currentId=activeHotspot===1?"cuhksz":"uva";
    if(targetId===currentId)return;
    if(detailSceneTimerRef.current)clearTimeout(detailSceneTimerRef.current);
    setSceneTransition({fromId:currentId,toId:targetId,run:performance.now()});
    detailSceneTimerRef.current=setTimeout(()=>{
      setVisualStopId(targetId);
      setSceneTransition(null);
      detailSceneTimerRef.current=null;
    },SCENE_TRANSITION_SECONDS*1000);
  },[activeHotspot,activeStop.id,forceAction,selectedBranch]);

  const chooseBranch = useCallback((branch:BranchId) => {
    // Re-selecting the active module is a true no-op. It must not restart the
    // wardrobe timeline or replay the same content transition.
    if(wardrobePhase||selectedBranch===branch)return;
    const motion=motionRef.current;
    motion.current=0;motion.target=0;motion.velocity=0;motion.previous=0;motion.lastInputAt=0;motion.moving=false;motion.travelElapsed=0;
    const targetOutfit=BRANCH_OUTFIT[branch];
    const finish=()=>{activeRef.current=0;setActiveIndex(0);setActiveHotspot(null);setSelectedBranch(branch);setVisualStopId(BRANCHES[branch][0].id);setSceneTransition(null);setWardrobePhase(null);forceAction("idle");};
    if(reducedRef.current){outfitRef.current=targetOutfit;setOutfit(targetOutfit);finish();return;}
    // AI is a knowledge-work route rather than another outfit chapter. Enter
    // it directly from every branch and keep the wardrobe sequence reserved
    // for the education/work/project clothing changes it actually explains.
    if(branch==="ai"){outfitRef.current=targetOutfit;setOutfit(targetOutfit);finish();return;}
    const sourceOutfit=outfitRef.current;
    // Wardrobe motion exists only to explain a real outfit change. Projects
    // use the casual outfit already shown in the hub, so entering projects
    // should go straight to the first project without a redundant turn/booth.
    if(sourceOutfit===targetOutfit){finish();return;}
    wardrobeRef.current={active:true,source:sourceOutfit,target:targetOutfit,branch,elapsed:0,switched:false};
    // Reuse the exact preloaded APNG URL. Adding a timestamp here bypassed the
    // decoded cache and made the browser fetch/decode the full sequence again
    // at click time, which presented as skipped frames.
    const wardrobeSource=wardrobeTransitionPath(sourceOutfit,targetOutfit);
    // Remounting the media element restarts the generated frame sequence at
    // frame 0 even when this same outfit transition was played previously.
    setWardrobeMedia(current=>({src:wardrobeSource,run:current.run+1}));
    setWardrobePhase("changing");forceAction("idle");
  },[forceAction,selectedBranch,wardrobePhase]);

  const returnToHub = useCallback(() => {
    if(wardrobePhase)return;
    const motion=motionRef.current;
    motion.current=0;motion.target=0;motion.velocity=0;motion.previous=0;motion.lastInputAt=0;motion.queue=[];motion.moving=false;motion.travelElapsed=0;motion.sceneToId="hub";
    activeRef.current=0;setActiveIndex(0);setActiveHotspot(null);setSelectedBranch(null);setVisualStopId("hub");setSceneTransition(null);forceAction("idle");
  },[forceAction,wardrobePhase]);

  useEffect(()=>{
    stopsRef.current=journeyStops;
    storyCardRefs.current.length=journeyStops.length;
  },[journeyStops]);

  useEffect(()=>{
    try{
      const raw=sessionStorage.getItem("yunan-portfolio-view");
      if(raw){
        const saved=JSON.parse(raw) as {entered?:boolean;branch?:BranchId|null;index?:number;locale?:Locale};
        const savedLocale:Locale=saved.locale==="en"?"en":"zh";
        // A new page visit should always begin at the cover. We still restore
        // the language and last route underneath it, but never skip the
        // explicit “开始探索” entrance because of an earlier tab session.
        setEntered(false);
        if(savedLocale!==locale)setLocale(savedLocale);
        if(saved.branch&&["education","work","projects","ai"].includes(saved.branch)){
          const source=(savedLocale==="en"?BRANCHES_EN:BRANCHES)[saved.branch];
          const index=clamp(Number(saved.index)||0,0,source.length-1);
          const target=index/(Math.max(1,source.length-1));
          setSelectedBranch(saved.branch);setActiveIndex(index);activeRef.current=index;
          setVisualStopId(source[index].id);setActiveHotspot(null);
          const restoredOutfit=BRANCH_OUTFIT[saved.branch];outfitRef.current=restoredOutfit;setOutfit(restoredOutfit);
          motionRef.current.current=target;motionRef.current.target=target;motionRef.current.previous=target;motionRef.current.moving=false;
        }
      }
    }catch{}
    setSessionReady(true);
    return()=>{if(detailSceneTimerRef.current)clearTimeout(detailSceneTimerRef.current);};
  },[]);

  useEffect(()=>{
    if(!sessionReady)return;
    try{sessionStorage.setItem("yunan-portfolio-view",JSON.stringify({entered,branch:selectedBranch,index:activeIndex,locale}));}catch{}
  },[activeIndex,entered,locale,selectedBranch,sessionReady]);

  useEffect(()=>{
    if(!avatarElementRef.current)return;
    avatarElementRef.current.src=wardrobePhase
      ? staticAvatarPath(outfit)
      : `${animationPath(outfit,actionLabel)}&run=${performance.now()}`;
  },[actionLabel,outfit,wardrobePhase]);

  useEffect(()=>{
    Object.values(STOP_VISUALS).forEach(visual=>{
      [sceneDayPath(visual),sceneLogoPath(visual)].filter(Boolean).forEach(path=>{const image=new Image();image.src=path!;});
    });
    SCENE_TRANSITION_PAIRS.forEach(([fromId,toId])=>{const image=new Image();image.src=sceneTransitionPath(fromId,toId);});
    AI_STOPS[0].details.forEach(detail=>{if(detail.projectScene){const image=new Image();image.src=detail.projectScene;}});
    PROJECT_STOPS.forEach(stop=>stop.details.forEach(detail=>{if(detail.projectScene){const image=new Image();image.src=detail.projectScene;}}));
    {const image=new Image();image.src="/ai-project-scenes/00-overview-integrated-v2-anim.webp";}
  },[]);

  useEffect(() => {
    const media=window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync=()=>{ reducedRef.current=media.matches; };
    sync(); media.addEventListener("change",sync); return()=>media.removeEventListener("change",sync);
  },[]);

  useEffect(() => {
    let cancelled=false;
    const load=(outfit:OutfitName,action:ActionName)=>new Promise<void>(resolve => {
      const path=animationPath(outfit,action);const image=new Image(); image.onload=()=>{imagesRef.current[path]=image;resolve();}; image.onerror=()=>resolve(); image.src=path;
    });
    const loadWardrobeTransition=(source:OutfitName,target:OutfitName)=>new Promise<void>(resolve=>{const path=wardrobeTransitionPath(source,target),image=new Image();image.onload=()=>{imagesRef.current[path]=image;resolve();};image.onerror=()=>resolve();image.src=path;});
    const critical:ActionName[]=["idle"];
    Promise.all([...OUTFITS.flatMap(name=>critical.map(action=>load(name,action))),...OUTFITS.map(target=>loadWardrobeTransition("casual",target))]).then(()=>{if(!cancelled){readyRef.current=true;setReady(true);OUTFITS.forEach(name=>(Object.keys(ACTIONS) as ActionName[]).filter(action=>!critical.includes(action)).forEach(action=>load(name,action)));OUTFITS.forEach(source=>OUTFITS.forEach(target=>loadWardrobeTransition(source,target)));}});
    return()=>{cancelled=true;};
  },[]);

  useEffect(() => {
    const root=rootRef.current; if(!root) return;
    const onPointerMove=(event:PointerEvent)=>{
      if(event.pointerType==="touch")return;
      root.style.setProperty("--pointer-x",String(clamp(event.clientX/innerWidth)));
      root.style.setProperty("--pointer-y",String(clamp(event.clientY/innerHeight)));
    };
    window.addEventListener("pointermove",onPointerMove,{passive:true});
    return()=>{window.removeEventListener("pointermove",onPointerMove);};
  },[]);

  useEffect(() => {
    if(!selectedBranch||wardrobePhase||selectedBranch==="work"||selectedBranch==="projects")return;
    const onWheel=(event:WheelEvent)=>{
      if(Math.abs(event.deltaY)<Math.abs(event.deltaX))return;
      event.preventDefault();
      const motion=motionRef.current,now=performance.now();
      if(now-motion.lastWheelAt>180)motion.wheelAccum=0;
      motion.lastWheelAt=now;motion.wheelAccum+=event.deltaY;
      if(Math.abs(motion.wheelAccum)<42||now-motion.lastInputAt<620)return;
      const direction=motion.wheelAccum>0?1:-1;
      const currentTarget=Math.round(motion.target*Math.max(1,stopsRef.current.length-1));
      const next=clamp(currentTarget+direction,0,stopsRef.current.length-1);
      motion.wheelAccum=0;
      if(next===currentTarget)return;
      motion.lastInputAt=now;
      goTo(next);
    };
    window.addEventListener("wheel",onWheel,{passive:false});
    return()=>window.removeEventListener("wheel",onWheel);
  },[goTo,selectedBranch,wardrobePhase]);

  useEffect(() => {
    if(!selectedBranch||wardrobePhase||selectedBranch==="work"||selectedBranch==="projects")return;
    let startX=0,startY=0,startAt=0,startTarget:EventTarget|null=null;
    const isInteractiveRegion=(target:EventTarget|null)=>{
      const element=target instanceof Element?target:null;
      return Boolean(element?.closest(".resume-facts,.hotspot-card,.journey-header-actions,.journey-footer,button,a,input,textarea,select"));
    };
    const onTouchStart=(event:TouchEvent)=>{
      if(event.touches.length!==1)return;
      const touch=event.touches[0];
      startX=touch.clientX;startY=touch.clientY;startAt=performance.now();startTarget=event.target;
    };
    const onTouchEnd=(event:TouchEvent)=>{
      if(event.changedTouches.length!==1||isInteractiveRegion(startTarget))return;
      const touch=event.changedTouches[0],deltaX=touch.clientX-startX,deltaY=touch.clientY-startY;
      if(performance.now()-startAt>900||Math.abs(deltaY)<46||Math.abs(deltaY)<Math.abs(deltaX)*1.2)return;
      const motion=motionRef.current,now=performance.now();
      if(now-motion.lastInputAt<520)return;
      const direction=deltaY<0?1:-1;
      const currentTarget=Math.round(motion.target*Math.max(1,stopsRef.current.length-1));
      const next=clamp(currentTarget+direction,0,stopsRef.current.length-1);
      if(next===currentTarget)return;
      motion.lastInputAt=now;
      goTo(next);
    };
    window.addEventListener("touchstart",onTouchStart,{passive:true});
    window.addEventListener("touchend",onTouchEnd,{passive:true});
    return()=>{
      window.removeEventListener("touchstart",onTouchStart);
      window.removeEventListener("touchend",onTouchEnd);
    };
  },[goTo,selectedBranch,wardrobePhase]);

  useEffect(() => {
    const worldCanvas=worldCanvasRef.current;
    if(!worldCanvas)return;
    const world=worldCanvas.getContext("2d");if(!world)return;
    const drawWorld=(progress:number)=>{
      const dpr=Math.min(window.devicePixelRatio||1,2),width=innerWidth,height=innerHeight;
      const pw=Math.round(width*dpr),ph=Math.round(height*dpr);
      if(worldCanvas.width!==pw||worldCanvas.height!==ph){worldCanvas.width=pw;worldCanvas.height=ph;worldCanvas.style.width=`${width}px`;worldCanvas.style.height=`${height}px`;}
      world.setTransform(dpr,0,0,dpr,0,0);world.clearRect(0,0,width,height);
      const spacing=Math.max(430,width*.76),camera=progress*(stopsRef.current.length-1)*spacing;
      const ground=height*(width<720?.87:.84);
      world.fillStyle="rgba(48,64,74,.08)";
      for(let i=-2;i<15;i++){
        const worldX=i*190-camera*.34;
        const x=((worldX%(width+260))+(width+260))%(width+260)-130;
        const blockHeight=28+((i*37)%5+5)%5*13;
        world.fillRect(Math.round(x),Math.round(ground-blockHeight),68,blockHeight);
        world.fillRect(Math.round(x+72),Math.round(ground-blockHeight*.62),26,Math.round(blockHeight*.62));
      }
    };
    const tick=(time:number)=>{
      const motion=motionRef.current,dt=Math.min(.05,Math.max(.001,(time-(motion.lastTime||time))/1000));motion.lastTime=time;
      const stops=stopsRef.current,stopCount=stops.length;
      const distance=motion.target-motion.current;
      if(reducedRef.current){motion.current=motion.target;motion.velocity=0;if(motion.moving){motion.moving=false;setVisualStopId(motion.sceneToId);setSceneTransition(null);}}
      else if(motion.moving){
        motion.travelElapsed+=dt;
        // Scene movement and character performance begin together, while the
        // selected action is free to finish naturally after the card lands.
        const transitionProgress=clamp(motion.travelElapsed/SCENE_TRANSITION_SECONDS);
        const eased=transitionProgress*transitionProgress*(3-2*transitionProgress);
        motion.current=motion.travelFrom+(motion.target-motion.travelFrom)*eased;
        if(motion.travelElapsed>=SCENE_TRANSITION_SECONDS){motion.current=motion.target;motion.moving=false;setVisualStopId(motion.sceneToId);setSceneTransition(null);}
      }
      const moving=Math.abs(motion.target-motion.current)>.0005;
      if(moving)motion.stillFor=0;else motion.stillFor+=dt;
      motion.previous=motion.current;
      // Scene metadata switches exactly where the two continuously moving
      // cards have equal visibility, so labels never lag behind the scene.
      const nearest=Math.round(motion.current*(stopCount-1));
      if(nearest!==activeRef.current){activeRef.current=nearest;setActiveIndex(nearest);setActiveHotspot(null);}
      const chapter=motion.current*(stopCount-1),floor=Math.floor(chapter),ceil=Math.min(stopCount-1,floor+1),local=chapter-floor;
      rootRef.current?.style.setProperty("--active-accent",mixHex(stops[floor].accent,stops[ceil].accent,local));
      rootRef.current?.style.setProperty("--scene-tint",mixHex(stops[floor].tint,stops[ceil].tint,local));
      rootRef.current?.style.setProperty("--scene-progress",String(chapter));
      rootRef.current?.style.setProperty("--chapter-local",String(local));
      rootRef.current?.style.setProperty("--avatar-x","0px");
      const travel=Math.min(innerWidth*.52,620);
      storyCardRefs.current.forEach((card,index)=>{if(!card)return;const distance=index-chapter,proximity=clamp(1-Math.abs(distance)),visibility=proximity*proximity*(3-2*proximity),x=distance*travel;
        card.style.opacity=String(visibility);card.style.transform=`translate3d(${x}px,0,0)`;card.style.pointerEvents=Math.abs(distance)<.45?"auto":"none";card.setAttribute("aria-hidden",Math.abs(distance)<.55?"false":"true");});
      if(reducedRef.current){if(motion.action!=="idle"){motion.action="idle";motion.frame=0;motion.frameTime=0;motion.queue=[];setActionLabel("idle");}}
      else{const config=ACTIONS[motion.action];motion.frameTime+=dt;motion.transitionTime=Math.max(0,motion.transitionTime-dt);const duration=1/config.fps;
          while(motion.frameTime>=duration){motion.frameTime-=duration;motion.frame++;if(motion.frame>=config.frames){if(motion.queue.length){const next=motion.queue.shift()!;const alignedWalkFrame=motion.action.startsWith("start_")&&next.startsWith("walk_")?6:0;motion.previousAction=motion.action;motion.previousFrame=config.frames-1;motion.transitionTime=ACTION_BLEND_SECONDS;motion.action=next;motion.frame=alignedWalkFrame;motion.frameTime=0;setActionLabel(next);}else if(config.loop)motion.frame=0;else{motion.previousAction=motion.action;motion.previousFrame=config.frames-1;motion.transitionTime=ACTION_BLEND_SECONDS;motion.action="idle";motion.frame=0;motion.frameTime=0;setActionLabel("idle");}}}}
      const change=wardrobeRef.current;
      if(change.active){
        change.elapsed+=dt;
        if(change.elapsed>=WARDROBE_SWITCH_SECONDS&&!change.switched){
          change.switched=true;
          outfitRef.current=change.target;setOutfit(change.target);
          // Replace the module while the eight-frame smoke bridge is still
          // fully opaque. The new scene is already present when the target
          // outfit begins to emerge, rather than popping in after the APNG.
          activeRef.current=0;setActiveIndex(0);setActiveHotspot(null);
          setSelectedBranch(change.branch);
          if(change.branch){setVisualStopId(BRANCHES[change.branch][0].id);setSceneTransition(null);}
        }
        if(change.elapsed>=WARDROBE_DURATION_SECONDS){
          change.active=false;
          setWardrobePhase(null);forceAction("idle");
        }
      }
      drawWorld(motion.current);rafRef.current=requestAnimationFrame(tick);
    };
    rafRef.current=requestAnimationFrame(tick);return()=>cancelAnimationFrame(rafRef.current);
  },[forceAction,playAction]);

  const progressLabel=useMemo(()=>selectedBranch?`${String(activeIndex+1).padStart(2,"0")} / ${String(journeyStops.length).padStart(2,"0")}`:locale==="en"?"CHOOSE":"选择",[activeIndex,locale,selectedBranch,journeyStops.length]);
  const effectiveVisualStopId=selectedBranch==="education"?(activeHotspot===1?"cuhksz":"uva"):visualStopId;
  const steadyVisual=STOP_VISUALS[effectiveVisualStopId];
  const incomingVisual=sceneTransition?STOP_VISUALS[sceneTransition.toId]:null;
  const evidenceScene=activeDetail?.projectScene??(selectedBranch==="projects"?activeStop.details[0]?.projectScene:"/ai-project-scenes/00-overview-integrated-v2-anim.webp");

  return <main ref={rootRef} className={`journey ui-${uiVariant} locale-${locale} scene-${activeStop.kind} scene-id-${activeStop.id} ${entered?"is-entered":"is-intro"} ${selectedBranch?`has-branch branch-${selectedBranch}`:""} ${sceneTransition?"is-scene-changing":""} ${activeHotspot===null?"":"has-active-artifact"} ${wardrobePhase?`wardrobe-${wardrobePhase}`:""}`} style={{"--active-accent":activeStop.accent,"--scene-tint":activeStop.tint} as React.CSSProperties}>
    <canvas ref={worldCanvasRef} className="world-canvas" aria-hidden="true" />
    {uiVariant==="tundra"&&<section className="tundra-environment" aria-hidden="true">
      <div className="tundra-sprite tundra-sprite-waterfall"/>
      <div className="tundra-sprite tundra-sprite-mist"/>
      <div className="tundra-sprite tundra-sprite-basalt"/>
      <div className="tundra-sprite tundra-sprite-ground"/>
      <div className="tundra-sprite tundra-sprite-beacon"/>
    </section>}
    {selectedBranch&&selectedBranch!=="ai"&&selectedBranch!=="projects"&&steadyVisual&&<section className="experience-backdrop" aria-hidden="true">
      <div className={`experience-visual experience-current ${steadyVisual.scene?"has-location":"is-logo-only"}`} style={sceneDayPath(steadyVisual)?{backgroundImage:`url(${sceneDayPath(steadyVisual)})`}:undefined} />
      <img className={`experience-logo experience-logo-current ${steadyVisual.scene?"":"is-logo-only"}`} src={sceneLogoPath(steadyVisual)} alt="" />
      {sceneTransition&&(selectedBranch==="work"||selectedBranch==="education")&&incomingVisual&&<img
        className={`experience-logo experience-logo-incoming ${incomingVisual.scene?"":"is-logo-only"}`}
        src={sceneLogoPath(incomingVisual)}
        alt=""
      />}
      {sceneTransition&&<img
        className="experience-day-night"
        key={sceneTransition.run}
        src={sceneTransitionPath(sceneTransition.fromId,sceneTransition.toId)}
        alt=""
      />}
    </section>}
    <div className="paper-noise" aria-hidden="true" />
    <div className="scene-frame" aria-hidden="true" />
    <div className="scene-layers" aria-hidden="true">
      <div className="scene-wash" />
      <div className="pixel-sky"><i/><i/><i/><i/><i/><i/><i/><i/></div>
      <div className="scene-artifact"><i/><i/><i/><i/><i/><i/><i/><i/></div>
      <div className="layer layer-far"><i/><i/><i/><i/></div>
      <div className="layer layer-near"><i/><i/><i/><i/><i/></div>
    </div>

    {sessionReady&&<section className="entry-screen" aria-hidden={entered}>
      <picture className="entry-cover-picture" aria-hidden="true">
        <source media="(max-width: 720px)" srcSet="/cover-assets/cover-complete-mobile-v1.png" />
        <img
          className="entry-cover-raster"
          src={coverHovered?"/cover-assets/cover-complete-hover-v12-black-hd.png":"/cover-assets/cover-complete-default-v11-hd.png"}
          alt=""
        />
      </picture>
      <button
        className="entry-cover-button-hit"
        onMouseEnter={()=>setCoverHovered(true)}
        onMouseLeave={()=>setCoverHovered(false)}
        onFocus={()=>setCoverHovered(true)}
        onBlur={()=>setCoverHovered(false)}
        onClick={()=>{returnToHub();setEntered(true);forceAction("idle");}}
        disabled={!ready}
        aria-busy={!ready}
        aria-label={ready?ui.start:ui.loading}
      >
        <span className="sr-only">{ready?ui.start:ui.loading}</span>
      </button>
    </section>}

    <header className="journey-header">
      <button
        className="journey-brand"
        onPointerDown={event=>{backPointerRef.current={x:event.clientX,y:event.clientY,moved:false};}}
        onPointerMove={event=>{const start=backPointerRef.current;if(start&&Math.hypot(event.clientX-start.x,event.clientY-start.y)>7)start.moved=true;}}
        onPointerUp={()=>{const start=backPointerRef.current;backPointerRef.current=null;if(start&&!start.moved)returnToHub();}}
        onPointerCancel={()=>{backPointerRef.current=null;}}
        onClick={event=>{if(event.detail===0)returnToHub();}}
        aria-label={ui.back}
      >
        <span>YL</span><b>YUNAN<small>{ui.workspace}</small></b>
        {selectedBranch&&<em className="journey-back-label"><i aria-hidden="true">←</i><span>{locale==="en"?"BACK TO MODULES":"返回模块选择"}</span></em>}
      </button>
      <div className="journey-header-actions">
        <details className="resume-menu">
          <summary>{locale==="en"?"RESUME DOWNLOAD":"简历下载"}</summary>
          <div className="resume-menu-popover">
            <a href="/resumes/Yunan_Lyu_Resume_ZH.docx" download><span>{locale==="en"?"Chinese Resume":"中文简历"}</span><small>DOCX · ZH ↓</small></a>
            <a href="/resumes/Yunan_Lyu_Resume_EN.docx" download><span>{locale==="en"?"English Resume":"英文简历"}</span><small>DOCX · EN ↓</small></a>
          </div>
        </details>
        {!selectedBranch&&<div className="language-switch" role="group" aria-label="Language / 语言"><button className={locale==="zh"?"active":""} onClick={()=>setLocale("zh")} aria-pressed={locale==="zh"}>中文</button><button className={locale==="en"?"active":""} onClick={()=>setLocale("en")} aria-pressed={locale==="en"}>EN</button></div>}
      </div>
    </header>

    {selectedBranch&&<aside className="journey-indicator-rail" aria-label={locale==="en"?"View indicators":"页面指示"}>
      <div className="rail-route"><small>{locale==="en"?"SECTION":"当前模块"}</small><strong>{selectedBranch.toUpperCase()}</strong></div>
      <div className="rail-progress"><small>{locale==="en"?"POSITION":"当前位置"}</small><b>{selectedBranch==="education"?"01 / 01":progressLabel}</b></div>
      <div className="language-switch" role="group" aria-label="Language / 语言"><button className={locale==="zh"?"active":""} onClick={()=>setLocale("zh")} aria-pressed={locale==="zh"}>中文</button><button className={locale==="en"?"active":""} onClick={()=>setLocale("en")} aria-pressed={locale==="en"}>EN</button></div>
    </aside>}

    <section className="story-panel" aria-live="polite">
      {journeyStops.map((stop,index)=><article className={`story-card ${stop.title.length>15?"is-long-title":""} ${(selectedBranch==="work"||selectedBranch==="projects")?"is-layered-browser":""}`} key={stop.id} ref={el=>{storyCardRefs.current[index]=el;}} aria-hidden={index===0?"false":"true"}>
        <p className="story-eyebrow"><span>{stop.number}</span>{stop.eyebrow}</p><SemanticTitle title={stop.title}/><StoryBody body={stop.body}/>
        {selectedBranch&&(selectedBranch==="work"||selectedBranch==="projects")?<div className="layered-browser" aria-label={locale==="en"?"Position and project browser":"职位与项目浏览"}>
          <nav className="layered-primary" aria-label={selectedBranch==="work"?(locale==="en"?"Positions":"职位"):(locale==="en"?"Projects":"项目")}>
            <small>{selectedBranch==="work"?(locale==="en"?"POSITION":"职位"):(locale==="en"?"PROJECT":"项目")}</small>
            {journeyStops.map((item,itemIndex)=>{const phrases=titlePhrases(item.title);return <button type="button" className={itemIndex===activeIndex?"active":""} key={item.id} disabled={Boolean(wardrobePhase)} onClick={()=>selectStopFromList(itemIndex)}><b>{phrases[0]}</b>{phrases[1]&&<span>{phrases[1]}</span>}</button>;})}
          </nav>
          <div className="layered-secondary" aria-label={locale==="en"?"Project details":"项目"}>
            <small>{selectedBranch==="work"?(locale==="en"?"PROJECTS & RESPONSIBILITIES":"项目与职责"):(locale==="en"?"EVIDENCE":"项目内容")}</small>
            <div className="layered-secondary-list">
              {stop.details.map((detail,detailIndex)=><button className={`layered-detail ${(explored[stop.id]??[]).includes(detailIndex)?"is-visited":""} ${index===activeIndex&&activeHotspot===detailIndex?"active":""}`} key={`${stop.id}-${detail.label}`} disabled={index!==activeIndex} aria-pressed={index===activeIndex&&activeHotspot===detailIndex} onClick={()=>selectDetail(detailIndex,detail)}><b>{detail.title}</b><span aria-hidden="true">→</span></button>)}
            </div>
          </div>
        </div>:selectedBranch&&<div className="resume-facts" aria-label={`${stop.eyebrow} ${locale==="en"?"highlights":"重点信息"}`}>
          {stop.details.map((detail,detailIndex)=><button className={`resume-fact ${(explored[stop.id]??[]).includes(detailIndex)?"is-visited":""} ${index===activeIndex&&activeHotspot===detailIndex?"active":""}`} key={`${stop.id}-${detail.label}`} disabled={index!==activeIndex} aria-pressed={index===activeIndex&&activeHotspot===detailIndex} onClick={()=>selectDetail(detailIndex,detail)}><small>{detail.label}</small><b>{detail.title}</b></button>)}
        </div>}
      </article>)}
    </section>

    <section className="avatar-stage" aria-label={locale==="en"?"Yunan interactive pixel character":"Yunan 的交互式像素形象"}>
      <img key={wardrobeMedia.run} ref={wardrobeElementRef} className="wardrobe-animation" src={wardrobeMedia.src||undefined} alt="" aria-hidden="true" />
      <div className="avatar-button" aria-hidden="true">
        <img ref={avatarElementRef} className="avatar-animation" alt="" src={wardrobePhase?staticAvatarPath(outfit):animationPath(outfit,"idle")} />
      </div>
    </section>

    {(selectedBranch==="ai"||selectedBranch==="projects")&&evidenceScene&&<section className="ai-knowledge-stage" aria-label={selectedBranch==="ai"?(locale==="en"?"AI operations knowledge network":"AI 运营知识网络"):(locale==="en"?"Project evidence scene":"项目成果场景")}>
      <div className={`ai-project-scene-wrap ${selectedBranch==="ai"&&!activeDetail?"is-overview":""}`} aria-hidden="true">
        <img
          className="ai-project-scene-static"
          src={evidenceScene.replace("-anim.webp",".png")}
          alt=""
        />
        <img
          className="ai-project-scene-animated"
          key={evidenceScene}
          src={evidenceScene}
          alt=""
        />
      </div>
    </section>}

    <section className="hotspot-field" aria-label={`${activeStop.eyebrow} ${locale==="en"?"interactive details":"可探索内容"}`}>
      {!selectedBranch&&<div className="branch-selector" aria-label={ui.choose}>
        {localizedBranchOptions.map(option=><button className={`pixel-route pixel-route-${option.id}`} key={option.id} onClick={()=>chooseBranch(option.id)}><small>{option.index} · {option.subtitle}</small><b>{option.title}</b><span>{ui.enter}</span></button>)}
      </div>}
      {selectedBranch&&<>
      {activeDetail&&<aside className={`hotspot-card ${detailExpanded?"is-expanded":"is-collapsed"}`}>
        <div className="hotspot-card-copy"><small>{ui.detail} · {activeStop.number}</small><b>{activeDetail.title}</b><p>{activeDetail.body}</p>{activeDetail.points&&<ul className="detail-points">{activeDetail.points.map(point=><li key={point.label}><strong>{point.label}</strong><span>{point.text}</span></li>)}</ul>}{activeDetail.sourceNote&&<em>{activeDetail.sourceNote}</em>}{activeStop.link&&activeHotspot===activeStop.details.length-1&&<a href={activeStop.link} target={activeStop.link.startsWith("http")?"_blank":undefined} rel="noreferrer">OPEN ↗</a>}</div>
        {selectedBranch==="ai"&&activeDetail.points&&<button className="detail-expand" type="button" aria-expanded={detailExpanded} onClick={()=>setDetailExpanded(value=>!value)}>{detailExpanded?ui.collapse:ui.expand}<span aria-hidden="true">{detailExpanded?"−":"+"}</span></button>}
      </aside>}
      </>}
    </section>

    <footer className="journey-footer">
      <div className="resume-downloads" aria-label={locale==="en"?"Resume downloads":"简历下载"}>
        <a className="resume-download" href="/resumes/Yunan_Lyu_Resume_ZH.docx" download><span>{locale==="en"?"Chinese Resume":"中文简历"}</span><small>DOCX · ZH ↓</small></a>
        <a className="resume-download" href="/resumes/Yunan_Lyu_Resume_EN.docx" download><span>{locale==="en"?"English Resume":"英文简历"}</span><small>DOCX · EN ↓</small></a>
      </div>
    </footer>

    <div className="drag-layer" aria-hidden="true" />
  </main>;
}
