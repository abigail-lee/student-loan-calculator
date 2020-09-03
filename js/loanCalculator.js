// Inject polyfill if classList not supported for SVG elements.
if (!('classList' in SVGElement.prototype)) {
  Object.defineProperty(SVGElement.prototype, 'classList', {
    get: function get() {
      var _this = this

      return {
        contains: function contains(className) {
          return _this.className.baseVal.split(' ').indexOf(className) !== -1
        },
        add: function add(className) {
          return _this.setAttribute(
            'class',
            _this.getAttribute('class') + ' ' + className
          )
        },
        remove: function remove(className) {
          var removedClass = _this
            .getAttribute('class')
            .replace(
              new RegExp('(\\s|^)'.concat(className, '(\\s|$)'), 'g'),
              '$2'
            )

          if (_this.classList.contains(className)) {
            _this.setAttribute('class', removedClass)
          }
        },
        toggle: function toggle(className) {
          if (this.contains(className)) {
            this.remove(className)
          } else {
            this.add(className)
          }
        }
      }
    }
  })
}

(function($) {
  
  /* *************** */
  /* Loan Calculator */
  /* *************** */

  window.loanCalculator = {

    calculate: function( details ) {

      var paymentDetails = {};

      details.additional ? details.additional = details.additional : details.additional = 0;
      details.rate = details.rate / 100;

      paymentDetails.monthlyPayment = details.rate === 0 ? details.debt / (details.term * 12) : (((details.rate / 12) * details.debt) / (1 - Math.pow( (1 + (details.rate / 12) ), -details.term*12 ))) + details.additional;
      paymentDetails.monthlyPayment = this.toFixed( paymentDetails.monthlyPayment, 2);
      paymentDetails.payments = this.getNumberOfPayments( paymentDetails.monthlyPayment, details );
      paymentDetails.totalPaid = paymentDetails.monthlyPayment * paymentDetails.payments;
      paymentDetails.totalInterestPaid = paymentDetails.totalPaid - details.debt;

      return paymentDetails;

    },

    getNumberOfPayments: function( monthlyPayment, loanDetails ) {

      return loanDetails.rate === 0 ? loanDetails.debt / monthlyPayment : Math.log( (monthlyPayment/ (loanDetails.rate/12)) / ((monthlyPayment/ (loanDetails.rate/12)) - loanDetails.debt) ) / Math.log( 1 + loanDetails.rate/12 );

    },

    toFixed: function( number, precision ) {

      // Custom toFixed function to avoid rounding inconsistency across browsers
      var multiplier = Math.pow( 10, precision + 1 ),
          wholeNumber = Math.floor( number * multiplier );
      return Math.round( wholeNumber / 10 ) * 10 / multiplier;

    }

  };


  /* **************** */
  /* Student Loan App */
  /* **************** */

  window.studentLoanApp = {

    //  App-wide settings
    settings: {

      inputs: {
        debt: {
          id: ".js--input-debt",
          defaultValue: "27000"
        },
        rate: {
          id: ".js--input-interest",
          defaultValue: "4.53"
        },
        term: {
          id: ".js--input-term",
          defaultValue: "10"
        },
        degree: {
          id: "#dropdown--one",
          defaultValue: "Average of all Majors"
        },
        compare: {
          id: "#dropdown--two",
          defaultValue: ""
        },
        fullTime: {
          id: ".js--input-fullTime",
          defaultValue: false
        },
        additional: {
          id: ".js--input-increase",
          defaultValue: "0"
        },
        earningsLevel: {
          id: ".js--input-earningsLevel",
          defaultValue: "median"
        }
      },
      displays: {
        payment: ".js--display-payment",
        totalPaid: ".js--display-totalPaid",
        interestPaid: ".js--display-interestPaid",
        principalPercent: ".js--principal-percent",
        principalTotal: ".js--principal-total",
        interestPercent: ".js--interest-percent",
        interestTotal: ".js--interest-total",
        unusedPercent: ".js--unused-percent",
        unusedTotal: ".js--unused-total"
      }

    },

    debtValues: {},
    earningsData: {},
    earningsOverLoan: 0,
    initiated: 0,
    paymentDetails: {},

    init: function() {

      var that = this;

      $(".js--tip").hide();
      $(".js--tip#primary-tip").show();
      document.getElementById("compare-tip").style = "";

      //  Watch each input for the app and update app on appropriate event
      $.each(this.settings.inputs, function(key, input) {
        var events = $(input.id).attr("type") === "text" ? "focusout keyup" : "change keyp";
        $(input.id).bind(events, function(e) {
          if( (e.type === "keyup" && e.keyCode === 13) || e.type !== "keyup") { 
            that.updateApp();
            if(input.id == ".js--input-term") {
              var slide = document.getElementById("year-slider");

              slide.max = that.debtValues.term;
            }
            return e.type === "keyup" ? false : true;
          }
        });
      });

      //  Add event to reset button
      $(".js--reset").click(function() {
        that.resetApp();
      });

      d3.csv("../data/earnings_median.csv", function(data) {
        that.earningsData = data;
        that.fillDropdowns();

      });

    },

    dataURL: function() {

      return "../data/earnings_" + this.debtValues.earningsLevel + ( this.debtValues.fullTime ? "_fulltime" : "" ) + ".csv";

    },

    displayTip: function(d, x0, margin, width, target, major) {

      var el = ".js--chart-1 #hover--tip.js--tip";

      var elWidth = $(el).outerWidth(),
          elHeight = $(el).outerHeight(),
          mouseY = d3.mouse(target)[1],
          percentFormat = d3.format(".1f"),
          dollarsFormat = d3.format("$,.0f"),
          parentClass = d3.select(target).select(function() { return this.parentNode; }).attr("class");

      $(el).removeClass("high mid low comparison");
      if( parentClass.indexOf("comparison") > -1 ) {
        $(el).addClass("comparison");
      }
      else {
        $(el).addClass( d.percentage >= .12 ? "high" : d.percentage > .10 ? "mid" : "low" );
      }
      $(el).show().css({
        "left": (x0(d.year) + margin.left + x0.rangeBand() + 10 + elWidth) > width ? x0(d.year) - elWidth + margin.left - 10 + "px" : x0(d.year) + margin.left + x0.rangeBand() + 10 + "px",
        "top": mouseY - elHeight/2 + "px",
        "z-index": "10"
      });
      $(el + " .js--major").html(`${major}`)
      $(el + " .js--tip-percent").html(percentFormat(d.percentage*100) + "<small>%</small>");
      $(el + " .js--tip-earnings").text(dollarsFormat(d.monthlyIncome));
      $(el + " .js--tip-loan").text(dollarsFormat(this.paymentDetails.monthlyPayment));

      return;

    },

    displayMobileTip: function(d, that){
      var primaryBars = document.querySelectorAll("g.primary rect.bar"),
          compareBars = document.querySelectorAll("g.comparison rect.bar"),
          primaryTip = ".js--chart-1 .js--tip#primary-tip",
          compareTip = ".js--chart-1 .js--tip#compare-tip",
          slider = document.getElementById("year-slider"),
          percentFormat = d3.format(".1f"),
          dollarsFormat = d3.format("$,.0f");

      function updateTips(elem,index, bars){
        var focus = d[index],
            yearIndex = slider.value - 1,
            subValuesPrefix = focus.values[yearIndex];

        $(elem).removeClass("high mid low comparison");
        if( elem == compareTip ) {
          $(elem).addClass("comparison");
        }
        else {
          $(compareTip).removeClass("comparison");
          $(elem).addClass( subValuesPrefix.percentage >= .12 ? "high" : subValuesPrefix.percentage > .10 ? "mid" : "low" );
        }


        function addBarFocus(elem) {
          bars.forEach(function(x) {
            if (bars == compareBars) {
              if (x == elem) {
                x.style.fill = "#929394";
              } else {
                x.style = "";
              }
            } else {
              if (x == elem) {
                if (x.classList.contains("percent-high")) {
                  x.style.fill = "#f05600";

                } else if (elem.classList.contains("percent-mid")) {
                  x.style.fill = "#efa600";

                } else if (elem.classList.contains("percent-low")) {
                  x.style.fill = "#509c1d";
                }
              } else {
                x.style = "";
              }
            }
          });
        };

        bars[yearIndex] == undefined ? "" : addBarFocus(bars[yearIndex]);

        $(elem + " .js--major").html(`${focus.name}`)
        $(elem + " .js--tip-percent").html(percentFormat(subValuesPrefix.percentage*100) + "<small>%</small>");
        $(elem + " .js--tip-earnings").text(dollarsFormat(subValuesPrefix.monthlyIncome));
        $(elem + " .js--tip-loan").text(dollarsFormat(that.paymentDetails.monthlyPayment));
      }

      // update main selection
      updateTips(primaryTip, 0, primaryBars);

      d.length <= 1 ? "" : updateTips(compareTip, 1, compareBars);

      // update compare selection
      
      return;
    },

    fillDropdowns: function() {

      var that = this,
          options = {};

      $.each(this.earningsData[0], function(key, value) {
        if(key !== "Year") {
          if(key.indexOf(" - ") > 0) {
            if(!options.hasOwnProperty(key.split(" - ")[0])) {
              options[key.split(" - ")[0]] = [];
            }
            options[key.split(" - ")[0]].push(key.split(" - ")[1]);
          }
          else {
            $(that.settings.inputs.degree.id + " .menu .section, " + that.settings.inputs.compare.id + " .menu .section").append(
              '<div class="item" data-value="' + key + '">' + key + '</div>'
            );
          }
        }
      });

      $(this.settings.inputs.degree.id).dropdown({
        onChange: function (value, text, $selectedItem) {
          if (value === $(that.settings.inputs.compare.id).dropdown("get value")) {
            $(that.settings.inputs.compare.id).dropdown("set value", "");
          };

          $(that.settings.inputs.compare.id + " .disabled").removeClass("disabled");
          if (value !== "") {
           $("[data-value='" + value + "']", that.settings.inputs.compare.id).addClass("disabled"); 
          }

          studentLoanApp.updateApp();
        }
      });

      $(this.settings.inputs.compare.id).dropdown({
        onChange: function (value, text, $selectedItem) {
          // if (value === $(that.settings.inputs.degree.id).dropdown("get value")) {
          //   $(that.settings.inputs.degree.id).dropdown("set value", "");
          // };

          $(that.settings.inputs.degree.id + " .disabled").removeClass("disabled");
          if (value !== "") {
           $("[data-value='" + value + "']", that.settings.inputs.degree.id).addClass("disabled"); 
          }

          var match = window.matchMedia("(max-width:991px)");

          if (match == true) {
            document.getElementById("compare-tip").style.display = "inline-flex";
          }

          studentLoanApp.updateApp();
        }
      });

      $(that.settings.inputs.compare.id).bind("change", function(){
          var match = window.matchMedia("(max-width:991px)");

          if (match == true) {
            document.getElementById("compare-tip").style.display = "inline-flex";
          }

          studentLoanApp.updateApp();
      });

      $("#dropdown--one").dropdown("set selected", "Average of all Majors");
    },

    filterData: function(data) {

      var keys, filteredData, that;

      that = this;

      //  Filter and format data
      keys = d3.keys(data[0]).filter(
        function(key) { return (key === that.debtValues.degree || key === that.debtValues.compare); }
      ).sort(function(a,b) {
        if(a === that.debtValues.degree) {
          return -1;
        }
        return 1;
      });

      filteredData = keys.map(function(name) {
        return {
          name: name,
          values: data.map(function(d) {
            return { year: +d.Year, monthlyIncome: +d[name]/12, percentage: that.paymentDetails.monthlyPayment / (+d[name]/12) };
          }).filter(function(d) {
            return d.year <= Math.ceil( (parseInt(that.paymentDetails.payments*100)/100) / 12 );
          })
        }
      });

      return filteredData;

    },

    resetApp: function() {

      $.each(this.settings.inputs, function(key, input) {
        if(input.defaultValue === false) {
          //  If default value is false, it's a checkbox and we want it unchecked
          $(input.id).prop("checked", false);
        }
        else if (input.id === ".js--input-earningsLevel" ) {
          var med = document.getElementById("median");

          $(med).prop("checked", true);
        }
        else if ($(input.id == "#dropdown--one" || input.id == "#dropdown--two")) {
            $("#dropdown--one").dropdown("set selected", "Average of all Majors");
            $("#dropdown--two").dropdown("restore defaults");
        } else {
          //  Otherwise just fill in default value
          $(input.id).val(input.defaultValue);
        }
      });

      //  Make sure chosen shows updated values
      $(".js--chosen").trigger("chosen:updated");

      this.updateApp();
      document.querySelector(".overlay").classList.remove("open");
    },

    updateDebtValues: function() {

      var values = {};

      $.each(this.settings.inputs, function(key, value) {
        if( $(value.id).attr("type") === "checkbox" ) {
          values[key] = $(value.id).prop("checked");
        }
        else if ( $(value.id).attr("type") === "radio" ) {
          $(value.id).each(function(x){
            if ($(this).prop("checked")) {
               values[key] = $(value.id)[x].id;
            } 
          });
        }
        else if( $(value.id).hasClass("dropdown") ) {
          values[key] = $(value.id).dropdown("get value");
        }
        else {
          values[key] = parseFloat( $(value.id).val().replace(/,/g,"") );
        }
      });

      this.debtValues = values;

      return;
    },

    updateApp: function() {

      var that = this;

      this.updateDebtValues();

      if( this.validate() ) {
        this.paymentDetails = loanCalculator.calculate(this.debtValues);

        //  Load data
        d3.csv(this.dataURL(), function(data) {
          that.earningsData = that.filterData(data);
          that.updatePercentageGraph();
          that.updateAppDisplays();
          that.updateTotalsGraph();
        });
      }

      return;

    },

    updateAppDisplays: function() {

      var formatDollarsWithCents = d3.format("$,.2f"),
          formatDollarsWithK = d3.format("$.3s"),
          formatDollars = d3.format("$,.0f"),
          formatPercent = d3.format(",.0%"),
          that = this,
          i;

      this.earningsOverLoan = 0;


      //  Get total earnings over loan plan
      $.each(this.earningsData, function(c, value) {
        if(that.earningsData[c].name === that.debtValues.degree) {

          for(i = 1; i <= Math.ceil(that.paymentDetails.payments / 12); i++) {
            if( ((that.paymentDetails.payments / 12) - i) >= 0 ) {

              //  Whole year
              //  Loop through each value until we find the correct year
              $.each(that.earningsData[c].values, function(j, value) {
                if(that.earningsData[c].values[j].year === i) {
                  that.earningsOverLoan += that.earningsData[c].values[j].monthlyIncome * 12;
                }
              });

            }
            else {
              //  Partial Year
              $.each(that.earningsData[c].values, function(j, value) {
                if(that.earningsData[c].values[j].year === i) {
                  // Multiply monthly earnings by the number of months we are paying in this partial year
                  that.earningsOverLoan += that.earningsData[c].values[j].monthlyIncome * (((that.paymentDetails.payments / 12) - i + 1)*12);
                }
              });

            }
              
          }

        }
      });

      //  Update displays
      $(this.settings.displays.payment).text( formatDollarsWithCents(this.paymentDetails.monthlyPayment) );
      $(this.settings.displays.totalPaid).text( formatDollars(this.paymentDetails.totalPaid) );
      $(this.settings.displays.interestPaid).text( formatDollars(this.paymentDetails.totalInterestPaid) );
      $(this.settings.displays.principalPercent).text( formatPercent(this.debtValues.debt / this.earningsOverLoan) );
      $(this.settings.displays.principalTotal).text( formatDollarsWithK(this.debtValues.debt) );
      $(this.settings.displays.interestPercent).text( formatPercent(this.paymentDetails.totalInterestPaid / this.earningsOverLoan) );
      $(this.settings.displays.interestTotal).text( formatDollarsWithK(this.paymentDetails.totalInterestPaid) );
      $(this.settings.displays.unusedPercent).text( formatPercent( (this.earningsOverLoan - this.paymentDetails.totalInterestPaid - this.debtValues.debt) / this.earningsOverLoan) );
      $(this.settings.displays.unusedTotal).text( formatDollarsWithK( (this.earningsOverLoan - this.paymentDetails.totalInterestPaid - this.debtValues.debt)) );

      return;

    },

    updatePercentageGraph: function() {

      var bars, allBars, x, x1, y, margin, width, height, xAxis, yAxis, svg, debt, that;

      var match = window.matchMedia("(max-width:991px)");

      that = this;

      that.displayMobileTip(that.earningsData, that);

      //  Margin
      margin = {top: 0, right: 0, bottom: 35, left: 20},
      width = 560 - margin.left - margin.right,
      height = 320 - margin.top - margin.bottom;

      //  x and y scales
      x0 = d3.scale
        .ordinal()
        .rangeRoundBands([0, width], .3, .6);
      x1 = d3.scale.ordinal();
      y = d3.scale
        .linear()
        .range([height, 0]);

      //  axes
      xAxis = d3.svg.axis().scale(x0)
        .orient("bottom")
        .tickSize(0);
      yAxis = d3.svg.axis()
        .scale(y)
        .orient("left")
        .tickSize(-width, 0, 0)
        .tickFormat(function(num) {
          return parseInt( num*100 );
        });

      //  Set x / y axis domains
      x0.domain(this.earningsData[0].values.map(function(d) { return d.year; }));
      x1.domain(d3.keys(this.earningsData)).rangeRoundBands([0, x0.rangeBand()]);
      y.domain([
        0,
        d3.max(this.earningsData, function(c) { return d3.max(c.values, function(v) { return v.percentage; }) + .01; })
      ]);

      if( !this.initiated ) {
        //  First time drawing graph

        //  main element
        svg = d3.select(".js--chart-1 .chart svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
          .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        //  Chart background color
        svg.append("rect")
          .attr("width", width)
          .attr("height", height)
          .style("fill", "#ffffff")
          .style("stroke", "#CCCCCC")
          .style("stroke-width","1px")
          .style("shape-rendering", "crispEdges;");

        //  Append axes
        svg.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(0," + height + ")")
            .call(xAxis)
          .append("text")
            .attr("y", 20)
            .attr("dy", ".71em")
            .attr("x", width/2)
            .style("text-anchor", "middle")
            .text("YEAR")
            .style("fill", "#BBB"); ;
        svg.append("g")
            .attr("class", "y axis")
          .append("rect")
            .attr("class","bg")
            .attr("width",20)
            .attr("height",height)
            .attr("x", -margin.left)
            .style("fill","#1C2E38");
        svg.selectAll(".y.axis")
            .call(yAxis)
          .append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", -margin.left + 6)
            .attr("dy", ".71em")
            .attr("x", -height/2)
            .style("text-anchor", "middle")
            .style("fill", "#fff")
            .text("PERCENTAGE OF MONTHLY INCOME");
        svg.selectAll(".y.axis .tick text")
          .attr("x", 5)
          .attr("y", ".75em")
          .style("text-anchor", "start");
        svg.select(".y.axis .tick text")
          .style("display", "none");

        bars = svg.selectAll(".bar")
            .data(this.earningsData)
            .enter()
          .append("g")
            .attr("class", function(d) { return "g bars" + (d.name === that.debtValues.degree ? " primary" : " comparison"); })
            .attr("transform", function(d, i) { return "translate(" + (i === 0 ? 0 : x1.rangeBand()) + ",0)"; });

        bars.selectAll(".bar")
            .data(function(d) { return d.values })
            .enter()
          .append("rect")
            .attr("class", function(d) {
              if(d.percentage >= .12) {
                return "bar percent-high";
              }
              else if (d.percentage < .12 && d.percentage > .10) {
                return "bar percent-mid";
              }
              else {
                return "bar percent-low";
              }
            })
            .attr("x", function(d) { return x0(d.year); })
            .attr("width", x1.rangeBand())
            .attr("y", function(d) { return y(d.percentage); })
            .attr("height", function(d) { return height - y(d.percentage); })
            .on("mouseover", function(d) {
              match.matches == true ? "" : that.displayTip(d, x0, margin, width, this, that.earningsData[0].name, "primary");
            })
            .on("mouseout", function(d) {
              match.matches == true ? "" : $(".js--chart-1 #hover--tip.js--tip").hide()
            });

        //  Let the app know we've draw the chart for the first time
        this.initiated = 1;
      }
      else {
        
        //  Update chart
        svg = d3.select(".js--chart-1 .chart svg").select("g");

        //  Redraw axes
        svg.selectAll(".x.axis")
          .transition()
          .call(xAxis)
          .selectAll(".tick .text");
        svg.selectAll(".y.axis")
          .transition()
          .call(yAxis)
          .selectAll(".y.axis .tick text")
          .attr("x", 5)
          .attr("y", ".75em")
          .style("text-anchor", "start");

        //  Update bar groups, add if need be
        bars = svg.selectAll(".bars")
          .data(this.earningsData);
        bars.enter().append("g");
        bars.exit().remove();
        bars.attr("class", function(d) { return "g bars" + (d.name === that.debtValues.degree ? " primary test" : " comparison test"); })
          .transition()
          .attr("transform", function(d, i) { return "translate(" + (i === 0 ? 0 : x1.rangeBand()) + ",0)"; });

        //  Update individual bars
        allBars = bars.selectAll(".bar").data(function(d) { return d.values });
        allBars.exit().remove();
        allBars.enter()
          .append("rect")
            .attr("width", x1.rangeBand())
            .attr("height", 0)
            .attr("y", y(0))
            .on("mouseover", function(d) {
              match.matches == true ? "" : that.displayTip(d, x0, margin, width, this, that.earningsData[1].name, "compare");
            })
            .on("mouseout", function(d) {
              match.matches == true ? "" : $(".js--chart-1 #hover--tip.js--tip").hide()
            });
        allBars.transition()
          .attr("class", function(d) {
            if(d.percentage >= .12) {
              return "bar percent-high";
            }
            else if (d.percentage < .12 && d.percentage > .10) {
              return "bar percent-mid";
            }
            else {
              return "bar percent-low";
            }
          })
          .attr("x", function(d) { return x0(d.year); })
          .attr("width", x1.rangeBand())
          .attr("y", function(d) { return y(d.percentage); })
          .attr("height", function(d) { return height - y(d.percentage); });
      }

    },

    updateTotalsGraph: function() {

      var width, height, that, arc, pie, svg, data, g;

      that = this;
      width = 215;
      height = 215;
      radius = Math.min(width, height) / 2;
      data =  "category,total\n" +
              "principal," + this.debtValues.debt.toString() + "\n" +
              "interest," + this.paymentDetails.totalInterestPaid.toString() + "\n" +
              "unused," + (this.earningsOverLoan - this.debtValues.debt - this.paymentDetails.totalInterestPaid).toString() + "\n";
      data = d3.csv.parse(data);
      data.forEach(function(d) {
        d.total = +d.total;
      });
      
      arc = d3.svg.arc()
        .outerRadius(radius)
        .innerRadius(radius - 40);

      pie = d3.layout.pie()
        .sort(null)
        .value(function(d) { return d.total; });

      $(".js--chart-2 .chart svg").remove();
      svg = d3.select(".js--chart-2 .chart").append("svg")
          .attr("width", width)
          .attr("height", height)
        .append("g")
          .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");

      g = svg.selectAll(".arc")
          .data(pie(data))
        .enter().append("g")
          .attr("class", "arc");

      g.append("path")
        .attr("d", arc)
        .style("fill", function(d) { 
          if(d.data.category === "interest") {
            return "#00ADCF";
          }
          if(d.data.category === "principal") {
            return "#6e2585";
          }
          if(d.data.category === "unused") {
            return "#007363";
          }
        });

        $(".chart-2 .js--earnings-sum-value").html(d3.format("$.3s")(this.earningsOverLoan));

    },

    validate: function() {

      var invalidFields = [];

      $(".input-wrap").removeClass("is-invalid");

      if( this.debtValues.degree !== "" ) {
        //  Only validate if a degree is chosen for display

        //  Debt amount
        if( !(this.debtValues.debt >= 0 && this.debtValues.debt <= 200000) ) {
          invalidFields.push(this.settings.inputs.debt.id);
        }

        //  Interest
        if( !(this.debtValues.rate >= 0 && this.debtValues.rate <= 15) ) {
          invalidFields.push(this.settings.inputs.rate.id);
        }

        //  Term
        if( !(this.debtValues.term >= 10 && this.debtValues.term <= 30) ) {
          invalidFields.push(this.settings.inputs.term.id);
        }
        
        //  Term
        if( !(this.debtValues.additional >= 0 && this.debtValues.additional <= 1000) ) {
          invalidFields.push(this.settings.inputs.additional.id);
        }

        //  Final check
        if( invalidFields.length ) {
          $.each(invalidFields, function(index, value) {
            $(value).parents(".input-wrap").addClass("is-invalid");
          });
          return false;
        }

        return true;

      }
      else {
        return false;
      }

    }

  };

  function interstital(){
    var helpBtn = document.getElementById("js--help"),
        closeBtn = document.getElementById("interstital__close"),
        openResetBtn = document.getElementById("open__reset"),
        cancelBtn = document.getElementById("reset__cancel"),
        overlay = document.querySelector(".overlay"),
        helpWindow = overlay.querySelector(".interstitial__help"),
        resetWindow = overlay.querySelector(".interstitial__reset"),
        openParamsBtn = document.getElementById("params-btn")
        closeParamsBtn = document.getElementById("params-close");

    helpBtn.addEventListener("click", function(){
      overlay.classList.add("open");
      helpWindow.classList.add("active");
    });

    closeBtn.addEventListener("click", function(){
      overlay.classList.remove("open");
      helpWindow.classList.remove("active");
    });

    openResetBtn.addEventListener("click", function(){
      overlay.classList.add("open");
      resetWindow.classList.add("active");
    });

    cancelBtn.addEventListener("click", function(){
      overlay.classList.remove("open");
      resetWindow.classList.remove("active");
    });

    openParamsBtn.addEventListener("click", function(){
      document.querySelector(".slc--params").classList.add("mobile-active");
      document.body.style.overflow = "hidden";
    });

    closeParamsBtn.addEventListener("click", function(){
      document.querySelector(".slc--params").classList.remove("mobile-active");
      document.body.style.overflow = "initial";
    })
  }

  function mobile(){
    var mobileFullTimeBtn = document.getElementById("full-time2");
    var regFullTimeBtn = document.getElementById("full-time");

    mobileFullTimeBtn.addEventListener("change",function(){
      regFullTimeBtn.checked == false ? regFullTimeBtn.checked = true : regFullTimeBtn.checked = false;
      
      studentLoanApp.updateApp();
    });

    regFullTimeBtn.addEventListener("change",function(){
      mobileFullTimeBtn.checked == false ? mobileFullTimeBtn.checked = true : mobileFullTimeBtn.checked = false;
    });    
  }

  function slider(){
    var slider = document.getElementById("year-slider");
    var output = document.getElementById("slider__number");
    output.value = slider.value; // Display the default slider value

    function moveSliderAndInput(slider, output){
        var percent = (slider.value -1) / (slider.max - slider.min) * 100;
        let width = slider.clientWidth - 15,
            min = slider.min,
            max = slider.max,
            offset = -3.5,
            percent2 = (slider.value - min) / (max - min);

        // the position of the output
        newPosition = width * percent2 + offset;

        // color the slider to the left of the thumb
        $(slider).css(
          "background",
          "linear-gradient(to right, #2A3F49 0%, #2A3F49 " +
            percent +
            "%, #d5d9da " +
            percent +
            "%, #d5d9da 100%)"
        );

        output.style.left = `${newPosition - 5}px`;
      }

    // Update the current slider value (each time you drag the slider handle)
    slider.oninput = function() {
      output.value = this.value;
      moveSliderAndInput(slider, output);
      studentLoanApp.updateApp();
    }

    output.oninput = function(){
      slider.value = output.value;
      moveSliderAndInput(slider, output);
      studentLoanApp.updateApp();
    }
  }


  /* ************* */
  /* On Load Setup */
  /* ************* */

  $(document).ready(function() {

    studentLoanApp.init();
    studentLoanApp.updateApp();

    interstital();
    mobile();
    slider();

  });

})(jQuery);
