/**
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var App = require('app');
require('messages');
require('views/wizard/step3_view');
var v;
describe('App.WizardStep3View', function () {
  Em.run.next = function(callback){
    callback()
  };
  var view = App.WizardStep3View.create({
    monitorStatuses: function () {
    },
    content: [
      Em.Object.create({
        name: 'host1',
        bootStatus: 'PENDING',
        isChecked: false
      }),
      Em.Object.create({
        name: 'host2',
        bootStatus: 'PENDING',
        isChecked: true
      }),
      Em.Object.create({
        name: 'host3',
        bootStatus: 'PENDING',
        isChecked: true
      })
    ],
    pageContent: function () {
      return this.get('content');
    }.property('content')
  });

  describe('#watchSelection', function () {
    it('2 of 3 hosts selected', function () {
      view.watchSelection();
      expect(view.get('noHostsSelected')).to.equal(false);
      expect(view.get('selectedHostsCount')).to.equal(2);
    });
    it('all hosts selected', function () {
      view.selectAll();
      view.watchSelection();
      expect(view.get('noHostsSelected')).to.equal(false);
      expect(view.get('selectedHostsCount')).to.equal(3);
    });
    it('none hosts selected', function () {
      view.unSelectAll();
      view.watchSelection();
      expect(view.get('noHostsSelected')).to.equal(true);
      expect(view.get('selectedHostsCount')).to.equal(0);
    });
  });

  describe('#selectAll', function () {
    it('select all hosts', function () {
      view.selectAll();
      expect(view.get('content').everyProperty('isChecked', true)).to.equal(true);
    });
  });

  describe('#unSelectAll', function () {
    it('unselect all hosts', function () {
      view.unSelectAll();
      expect(view.get('content').everyProperty('isChecked', false)).to.equal(true);
    });
  });

  var testCases = Em.A([
    {
      title: 'none hosts',
      content: [],
      result: {
        "ALL": 0,
        "RUNNING": 0,
        "REGISTERING": 0,
        "REGISTERED": 0,
        "FAILED": 0
      }
    },
    {
      title: 'all hosts RUNNING',
      content: [
        Em.Object.create({
          name: 'host1',
          bootStatus: 'RUNNING'
        }),
        Em.Object.create({
          name: 'host2',
          bootStatus: 'RUNNING'
        }),
        Em.Object.create({
          name: 'host3',
          bootStatus: 'RUNNING'
        })
      ],
      result: {
        "ALL": 3,
        "RUNNING": 3,
        "REGISTERING": 0,
        "REGISTERED": 0,
        "FAILED": 0
      }
    },
    {
      title: 'all hosts REGISTERING',
      content: [
        Em.Object.create({
          name: 'host1',
          bootStatus: 'REGISTERING'
        }),
        Em.Object.create({
          name: 'host2',
          bootStatus: 'REGISTERING'
        }),
        Em.Object.create({
          name: 'host3',
          bootStatus: 'REGISTERING'
        })
      ],
      result: {
        "ALL": 3,
        "RUNNING": 0,
        "REGISTERING": 3,
        "REGISTERED": 0,
        "FAILED": 0
      }
    },
    {
      title: 'all hosts REGISTERED',
      content: [
        Em.Object.create({
          name: 'host1',
          bootStatus: 'REGISTERED'
        }),
        Em.Object.create({
          name: 'host2',
          bootStatus: 'REGISTERED'
        }),
        Em.Object.create({
          name: 'host3',
          bootStatus: 'REGISTERED'
        })
      ],
      result: {
        "ALL": 3,
        "RUNNING": 0,
        "REGISTERING": 0,
        "REGISTERED": 3,
        "FAILED": 0
      }
    },
    {
      title: 'all hosts FAILED',
      content: [
        Em.Object.create({
          name: 'host1',
          bootStatus: 'FAILED'
        }),
        Em.Object.create({
          name: 'host2',
          bootStatus: 'FAILED'
        }),
        Em.Object.create({
          name: 'host3',
          bootStatus: 'FAILED'
        })
      ],
      result: {
        "ALL": 3,
        "RUNNING": 0,
        "REGISTERING": 0,
        "REGISTERED": 0,
        "FAILED": 3
      }
    },
    {
      title: 'first host is FAILED, second is RUNNING, third is REGISTERED',
      content: [
        Em.Object.create({
          name: 'host1',
          bootStatus: 'FAILED'
        }),
        Em.Object.create({
          name: 'host2',
          bootStatus: 'RUNNING'
        }),
        Em.Object.create({
          name: 'host3',
          bootStatus: 'REGISTERED'
        })
      ],
      result: {
        "ALL": 3,
        "RUNNING": 1,
        "REGISTERING": 0,
        "REGISTERED": 1,
        "FAILED": 1
      }
    },
    {
      title: 'two hosts is REGISTERING, one is REGISTERED',
      content: [
        Em.Object.create({
          name: 'host1',
          bootStatus: 'REGISTERING'
        }),
        Em.Object.create({
          name: 'host2',
          bootStatus: 'REGISTERING'
        }),
        Em.Object.create({
          name: 'host3',
          bootStatus: 'REGISTERED'
        })
      ],
      result: {
        "ALL": 3,
        "RUNNING": 0,
        "REGISTERING": 2,
        "REGISTERED": 1,
        "FAILED": 0
      }
    }
  ]);

  describe('#countCategoryHosts', function () {
    testCases.forEach(function (test) {
      it(test.title, function () {
        view.set('content', test.content);
        view.countCategoryHosts();
        view.get('categories').forEach(function (category) {
          expect(category.get('hostsCount')).to.equal(test.result[category.get('hostsBootStatus')])
        })
      });
    }, this);
  });

  describe('#filter', function () {
    testCases.forEach(function (test) {
      describe(test.title, function () {
        view.get('categories').forEach(function (category) {
          it('. Selected category - ' + category.get('hostsBootStatus'), function () {
            view.set('content', test.content);
            view.selectCategory({context: category});
            view.filter();
            expect(view.get('filteredContent').length).to.equal(test.result[category.get('hostsBootStatus')])
          });
        })
      });
    }, this);
  });

  describe('#monitorStatuses', function() {
    var tests = Em.A([
      {
        controller: Em.Object.create({bootHosts: Em.A([])}),
        m: 'Empty hosts list',
        e: {status: 'alert-warn', linkText: ''}
      },
      {
        controller: Em.Object.create({bootHosts: Em.A([{}]), isWarningsLoaded: false}),
        m: 'isWarningsLoaded false',
        e: {status: 'alert-info', linkText: ''}
      },
      {
        controller: Em.Object.create({bootHosts: Em.A([{}]), isWarningsLoaded: true, isHostHaveWarnings: true}),
        m: 'isWarningsLoaded true, isHostHaveWarnings true',
        e: {status: 'alert-warn', linkText: Em.I18n.t('installer.step3.warnings.linkText')}
      },
      {
        controller: Em.Object.create({bootHosts: Em.A([{}]), isWarningsLoaded: true, repoCategoryWarnings: ['']}),
        m: 'isWarningsLoaded true, repoCategoryWarnings not empty',
        e: {status: 'alert-warn', linkText: Em.I18n.t('installer.step3.warnings.linkText')}
      },
      {
        controller: Em.Object.create({bootHosts: Em.A([{}]), isWarningsLoaded: true, diskCategoryWarnings: ['']}),
        m: 'isWarningsLoaded true, diskCategoryWarnings not empty',
        e: {status: 'alert-warn', linkText: Em.I18n.t('installer.step3.warnings.linkText')}
      },
      {
        controller: Em.Object.create({bootHosts: Em.A([{}]), isWarningsLoaded: true, diskCategoryWarnings: [], repoCategoryWarnings: []}),
        m: 'isWarningsLoaded true, diskCategoryWarnings is empty, repoCategoryWarnings is empty',
        e: {status: 'alert-success', linkText: Em.I18n.t('installer.step3.noWarnings.linkText')}
      },
      {
        controller: Em.Object.create({bootHosts: Em.A([{bootStatus: 'FAILED'}]), isWarningsLoaded: true, diskCategoryWarnings: [], repoCategoryWarnings: []}),
        m: 'isWarningsLoaded true, diskCategoryWarnings is empty, repoCategoryWarnings is empty, all failed',
        e: {status: 'alert-warn', linkText: ''}
      }
    ]);

    tests.forEach(function(test) {
      it(test.m, function() {
        v = App.WizardStep3View.create({
          controller: test.controller
        });
        v.monitorStatuses();
        expect(v.get('status')).to.equal(test.e.status);
        expect(v.get('linkText')).to.equal(test.e.linkText);
      });
    });
  });

  describe('#retrySelectedHosts', function() {
    it('should set active category "All"', function() {
      view.set('controller', Em.Object.create({retrySelectedHosts: Em.K, registeredHosts: []}));
      view.retrySelectedHosts();
      expect(view.get('categories').findProperty('hostsBootStatus', 'ALL').get('isActive')).to.equal(true);
    });
  });

  describe('#selectCategory', function() {
    var tests = Em.A(['ALL','RUNNING','REGISTERING','REGISTERED','FAILED']);
    tests.forEach(function(test) {
      it('should set active category "' + test + '"', function() {
        view.set('controller', Em.Object.create({retrySelectedHosts: Em.K, registeredHosts: []}));
        view.selectCategory({context:Em.Object.create({hostsBootStatus:test})});
        expect(view.get('categories').findProperty('hostsBootStatus', test).get('isActive')).to.equal(true);
      });
    });
  });

  describe('#countCategoryHosts', function() {
    it('should set host count for each category', function() {
      view.set('content', Em.A([
        Em.Object.create({bootStatus: 'RUNNING'}),
        Em.Object.create({bootStatus: 'REGISTERING'}),
        Em.Object.create({bootStatus: 'REGISTERED'}),
        Em.Object.create({bootStatus: 'FAILED'})
      ]));
      view.countCategoryHosts();
      expect(view.get('categories').mapProperty('hostsCount')).to.eql([4,1,1,1,1]);
    });
  });

  describe('#hostBootStatusObserver', function() {
    it('should call "Em.run.once" three times', function() {
      sinon.spy(Em.run, 'once');
      view.hostBootStatusObserver();
      expect(Em.run.once.calledThrice).to.equal(true);
      expect(Em.run.once.firstCall.args[1]).to.equal('countCategoryHosts');
      expect(Em.run.once.secondCall.args[1]).to.equal('filter');
      expect(Em.run.once.thirdCall.args[1]).to.equal('monitorStatuses');
      Em.run.once.restore();
    });
  });

  describe('#watchSelection', function() {
    describe('should set "pageChecked"', function() {
      var tests = Em.A([
        {pageContent: Em.A([]),m:'false if empty "pageContent"', e: false},
        {pageContent: Em.A([{isChecked: false}]),m:'false if not-empty "pageContent" and not all "isChecked" true', e: false},
        {pageContent: Em.A([{isChecked: true}]),m:'true if not-empty "pageContent" and all "isChecked" true', e: false}
      ]);
      tests.forEach(function(test) {
        it(test.m, function() {
          view.set('pageContent', test.pageContent);
          view.watchSelection();
          expect(view.get('pageChecked')).to.equal(test.e);
        });
      });
    });
    describe('should set "noHostsSelected" and "selectedHostsCount"', function() {
      var tests = Em.A([
        {pageContent: Em.A([]),content:Em.A([]),m:' - "true", "0" if content is empty',e:{selectedHostsCount: 0, noHostsSelected: true}},
        {pageContent: Em.A([]),content:Em.A([Em.Object.create({isChecked: false})]),m:' - "true", "0" if no one isChecked',e:{selectedHostsCount: 0, noHostsSelected: true}},
        {pageContent: Em.A([]),content:Em.A([Em.Object.create({isChecked: true}),Em.Object.create({isChecked: false})]),m:' - "false", "1" if one isChecked',e:{selectedHostsCount: 1, noHostsSelected: false}}
      ]);
      tests.forEach(function(test) {
        it(test.m, function() {
          view.set('pageContent', test.pageContent);
          view.set('content', test.content);
          view.watchSelection();
          expect(view.get('noHostsSelected')).to.equal(test.e.noHostsSelected);
          expect(view.get('selectedHostsCount')).to.equal(test.e.selectedHostsCount);
        });
      });
    });
  });

  describe('#watchSelectionOnce', function() {
    it('should call "Em.run.once" one time', function() {
      sinon.spy(Em.run, 'once');
      view.watchSelectionOnce();
      expect(Em.run.once.calledOnce).to.equal(true);
      expect(Em.run.once.firstCall.args[1]).to.equal('watchSelection');
      Em.run.once.restore();
    });
  });

  describe('#selectedCategory', function() {
    it('should equal category with isActive = true', function() {
      view.get('categories').findProperty('hostsBootStatus', 'FAILED').set('isActive', true);
      expect(view.get('selectedCategory.hostsBootStatus')).to.equal('FAILED');
    });
  });

  describe('#onPageChecked', function() {
    var tests = Em.A([
      {
        selectionInProgress: true,
        pageContent: [Em.Object.create({isChecked: true}), Em.Object.create({isChecked: false})],
        pageChecked: true,
        m: 'shouldn\'t do nothing if selectionInProgress is true',
        e: [true, false]
      },
      {
        selectionInProgress: false,
        pageContent: [Em.Object.create({isChecked: true}), Em.Object.create({isChecked: false})],
        pageChecked: true,
        m: 'should set each isChecked to pageChecked value',
        e: [true, true]
      }
    ]);
    tests.forEach(function(test) {
      it(test.m, function() {
        v = App.WizardStep3View.create({
          'pageContent': test.pageContent,
          'pageChecked': test.pageChecked,
          'selectionInProgress': test.selectionInProgress
        });
        v.onPageChecked();
        expect(v.get('pageContent').mapProperty('isChecked')).to.eql(test.e);
      });
    });
  });

});

var wView;
describe('App.WizardHostView', function() {

  beforeEach(function() {
    wView = App.WizardHostView.create({
      hostInfo: {},
      controller: Em.Object.create({
        removeHost: Em.K,
        retryHost: Em.K
      })
    });
    sinon.spy(wView.get('controller'), 'retryHost');
    sinon.spy(wView.get('controller'), 'removeHost');
  });

  afterEach(function() {
    wView.get('controller').retryHost.restore();
    wView.get('controller').removeHost.restore();
  });

  describe('#retry', function() {
    it('should call controller.retryHost', function() {
      wView.retry();
      expect(wView.get('controller').retryHost.calledWith({})).to.equal(true);
      expect(wView.get('controller').retryHost.calledOnce).to.equal(true);
    });
  });

  describe('#remove', function() {
    it('should call controller.removeHost', function() {
      wView.remove();
      expect(wView.get('controller').removeHost.calledWith({})).to.equal(true);
      expect(wView.get('controller').removeHost.calledOnce).to.equal(true);
    });
  });

});
