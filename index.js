

const color = [
  "#1ba3c6",
  "#21b087",
  "#f8b620",
  "#f88113",
  "#eb364a",
  "#eb73b3",
  "#7873c0",
];
let books;
class Bar {

  constructor(data) {
    this.data = data;

    this.initBarSvg();
    this.tips();
    this.drawBar();
  }


  get_Width_Height(node) {
    this.width = node.node().getBoundingClientRect().width;
    this.height = node.node().getBoundingClientRect().height*0.95;
  }

  //添加SVG
  initBarSvg() {
    //选择div容器
    let div = d3.select("#bar");
    this.get_Width_Height(div);

    this.margin = { left: 60, right: 20, top: 60, bottom: 30 };
    this.innerW = this.width - this.margin.left - this.margin.right;
    this.innerH = this.height - this.margin.top - this.margin.bottom;

    //创建svg
    this.svg = div
      .append("svg")
      .attr("width", this.width)
      .attr("height", this.height);

    this.ChartArea = this.svg
      .append("g")
      .attr("transform", `translate(${this.margin.left},${this.margin.top})`);

     //周标签
    this.ChartArea.append("text")
      .attr("transform", `translate(${this.innerW / 2},${this.innerH + 30})`)
      .text("Book");
    this.ChartArea.append("text")
      .attr("transform", `translate(${-45},${this.innerH / 1.2}) rotate(270)`)
      .text("Count of distinct position");

    //title
    this.svg.append("text").attr("x", 80).attr("y", 40).text("Books");
    this.DrawArea = this.ChartArea.append("g");

    this.x = d3
      .scaleBand()
      .range([0, this.innerW])
      .domain(this.data.map((d) => d[0]))
      .padding(0.3);
    this.y = d3
      .scaleLinear()
      .range([this.innerH, 0])
      .domain([0, d3.max(this.data, (d) => d[1])]);
    this.AxisY = this.ChartArea.append("g");
    this.AxisX = this.ChartArea.append("g").attr(
      "transform",
      `translate(0,${this.innerH})`
    );
    this.AxisX.call(d3.axisBottom(this.x));
  }

  drawBar(data) {

    //根据数据变化来重新渲染比例尺的Y轴
    let _data = data ? data : this.data;
    this.y.domain([0, d3.max(_data, (d) => d[1])]);
    this.AxisY.call(d3.axisLeft(this.y).tickFormat(d3.format(".0f")));

    this.color = d3
      .scaleOrdinal()
      .domain(_data.map((d) => d[0]))
      .range(color);

    let bar = this.DrawArea.selectAll("rect")
      .data(_data)
      .join("rect")
      .attr("class", (d) => replaceSymbol(d[0])) //设置一个类名,方便后续调用
      .attr("x", (d) => this.x(d[0]))
      .attr("y", (d) => this.y(d[1]))
      .attr("width", this.x.bandwidth())
      .attr("height", (d) => this.innerH - this.y(d[1]))

      .attr("stroke-width", "0.25")
      .attr("fill", (d) => this.color(d[0]));

    
    bar
      .on("mouseover", this.tool_tip.show)
      // add mouseout event
      .on("mouseout", this.tool_tip.hide);
    this.clicked = false;
    bar.on("click", (e, d) => {

      if (!this.clicked) {
        this.clicked = true;
        d3.selectAll("circle").attr("opacity", 0.2);
        d3.selectAll(`.${replaceSymbol(d[0])}`).attr("opacity", 1);
      } else {
        this.clicked = false;
        d3.selectAll("circle").attr("opacity", 0.8);
      }
    });
    this.drawBarText(_data);

  }

//添加柱形图上的文本
  drawBarText(_data) {
    this.DrawArea.selectAll("mytext")
      .data(_data)
      .join("text")
      .attr("class", (d) => `mytext ${replaceSymbol(d[0])}`)
      .attr("x", (d) => this.x(d[0]) + this.x.bandwidth() / 2)
      .attr("y", (d) => this.y(d[1]) - 20)
      .attr("fill", (d) => this.color(d[0]))
      .attr("text-anchor", "middle")
      .text((d) => d[0]);
    this.DrawArea.selectAll("mynumber")
      .data(_data)
      .join("text")
      .attr("class", (d) => `mynumber ${d[0]}`) 
      .attr("x", (d) => this.x(d[0]) + this.x.bandwidth() / 2)
      .attr("y", (d) => this.y(d[1]) - 3)
      .attr("text-anchor", "middle")
      .attr("fill", (d) => this.color(d[0]))
      .text((d) => d[1]);
  }

  //tip提示框事件注册
  tips() {
    this.tool_tip = d3
      .tip()
      .attr("class", "d3-tip")
      .offset([0, 0])
      .html((e, d) => ` <li>${d[0]}</li><li><strong>${d[1]}</strong></li>`);
    this.svg.call(this.tool_tip);
  }
}

class Harry {
  constructor() {
    this.init();
  }
  async init() {

    //获取数据
    this.book = await d3.csv("./book.csv");
    this.spell = await d3.csv("./hp-spell-dictionary.csv");

    this.book.forEach((d) => {

      //将数据整合
      let value = this.spell.find((v) => d.Spell === v.Spell_Lower);
      Object.assign(d, value);
    });

    //将数据整合成柱形图所需数据，汇总为book和position的聚合
    const handleBook = d3.group(
      this.book,
      (d) => d.Book,
      (d) => d.Position
    );

    //Bar  获取属的名字
    let book_data = Array.from(handleBook);
    books = book_data.map((d) => d[0]);


    //获得每个book的魔咒数量.
    book_data.forEach((d) => (d[1] = d[1].size));

    new Bar(book_data);//画Bar图

    //散点图的数据汇总,获取排序的字段依据,min position和countposition
    let scatter_data = d3.rollups(
      this.book,
      (d) => {
        return {
          value: d3.sum(d, (v) => +v.Position),
          data: d,
          minPosition: d3.min(d, (v) => +v.Position),
          countPosition: 1 / d3.count(d, (v) => +v.Position),
        };
      },

      //将数据整合成散点图所需数据
      (d) => d.Spell,
      (d) => d.Book
    );
    new Scatter(scatter_data);

    	//筛选事件触发,重新画散点图
    d3.select("#Sort").on("change", () => {
      new Scatter(scatter_data);
    });
  }
}

class Scatter {
  constructor(data) {
    this.data = data;

    this.initSvg();
    this.tips();
    this.drawCircle();
  }


  get_Width_Height(node) {
    this.width = node.node().getBoundingClientRect().width;
    this.height = 1200;
  }

   //添加SVG
  initSvg() {
    let div = d3.select("#scattor");
    div.selectAll("*").remove();
    this.get_Width_Height(div);

    this.margin = { left: 160, right: 20, top: 60, bottom: 50 };
    this.innerW = this.width - this.margin.left - this.margin.right;
    this.innerH = this.height - this.margin.top - this.margin.bottom;

    //创建svg
    this.svg = div
      .append("svg")
      .attr("width", this.width)
      .attr("height", this.height);


    this.ChartArea = this.svg
      .append("g")
      .attr("transform", `translate(${this.margin.left},${this.margin.top})`);

    this.ChartArea.append("text")
      .attr("transform", `translate(${this.innerW / 2},${this.innerH + 30})`)
      .text("Sum of Position");
    this.ChartArea.append("text")
      .attr("transform", `translate(${-125},${this.innerH / 2}) rotate(270)`)
      .text("Spell");
    //title
    this.svg.append("text").attr("x", 80).attr("y", 40).text("Spells");
    this.DrawArea = this.ChartArea.append("g");

    this.y = d3
      .scaleBand()
      .range([0, this.innerH])
      .domain(this.data.map((d) => d[0]))
      .padding(0.3);
    this.x = d3
      .scaleLinear()
      .range([0, this.innerW])
      .domain([0, d3.max(this.data, (d) => d3.max(d[1], (v) => v[1].value))]);
    this.AxisY = this.ChartArea.append("g");
    this.AxisX = this.ChartArea.append("g").attr(
      "transform",
      `translate(0,${this.innerH})`
    );
    this.AxisX.call(d3.axisBottom(this.x));
    this.AxisY.call(d3.axisLeft(this.y).tickSize(-this.innerW));
  }

   //画点
  drawCircle(data) {
    let _data = data ? data : this.data;
    //排序
    let sortMethod = d3.select("#Sort").property("value");
    if (sortMethod !== "Appearence") {
      _data.sort((a, b) => {
        return d3.min(a[1], (v) => v[1].minPosition) >
          d3.min(b[1], (v) => v[1].minPosition)
          ? 1
          : -1;
      });
    } else {
      _data.sort((a, b) => {
        return d3.sum(a[1], (v) => v[1].countPosition) >
          d3.sum(b[1], (v) => v[1].countPosition)
          ? 1
          : -1;
      });
    }


    this.color = d3.scaleOrdinal().domain(books).range(color);

    
      //画点的每一行的容器 g
    let circles = this.DrawArea.selectAll("group")
      .data(_data)
      .join("g")
      .attr("class", (d) => `group ${replaceSymbol(d[0])}`) 
      .attr("transform", (d) => `translate(0,${this.y(d[0])})`);

    circles
      .selectAll("circle")
      .data((d) => d[1])
      .join("circle")
      .attr("cx", (d) => this.x(d[1].value))
      .attr("class", (d) => `${replaceSymbol(d[0])}`)
      .attr("r", 4)
      .attr("fill", (d) => this.color(d[0]))
      .attr("opacity", 0.7)

      
      .on("mouseover",(e,d)=>{this.tool_tip.show(e,d)} )
      // add mouseout event
      .on("mouseout", this.tool_tip.hide);
  }

  
  tips() {
    this.tool_tip = d3
      .tip()
      .attr("class", "d3-tip")
      .offset([0, 0])
      .html(
        (e, d) => ` <li>${d[0]}</li><li><strong>${d[1].data[0].Effect}</strong></li>
      <li>${d[1].data[0].Concordance}</li>
      `
      );
    this.svg.call(this.tool_tip);
  }
}


new Harry();//执行Harry代码

function replaceSymbol(str) {
  return "c" + str.replace(/: /g, "a");
}
