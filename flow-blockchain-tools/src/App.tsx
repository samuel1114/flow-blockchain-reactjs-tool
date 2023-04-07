import React, { useEffect } from 'react';
import { LaptopOutlined, NotificationOutlined, UserOutlined } from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { Breadcrumb, Layout, Menu, theme } from 'antd';
import './App.css';
import MenuItem from 'antd/es/menu/MenuItem';
import BatchTransaction from './transaction/batchTransaction';
import { AuthService } from './auth/AuthService';
import axios from 'axios';
import MintToken from './mint/mintToken';
type MenuItem = Required<MenuProps>['items'][number];

const { Header, Content, Sider } = Layout;

/*const items1: MenuProps['items'] = ['1', '2', '3'].map((key) => ({
  key,
  label: `nav ${key}`,
}));*/
const items1: MenuProps['items'] = [].map((key) => ({
  key,
  label: `nav ${key}`,
}));

function getItem(
  label: React.ReactNode,
  key: React.Key,
  icon?: React.ReactNode,
  children?: MenuItem[],
  type?: 'group',
): MenuItem {
  return {
    key,
    icon,
    children,
    label,
    type,
  } as MenuItem;
}

const items: MenuItem[] = [
  getItem('FLOW Blockchain', 'flow-sub', <LaptopOutlined />, [
    getItem('FLOW Token Transaction', 'flow-sub-01')
  ]),
  getItem('Logout', 'logout')
];

const App: React.FC = () => {
  const {
    token: { colorBgContainer },
  } = theme.useToken();

  useEffect(() => {
    let authService = new AuthService();
    authService.getUser().then(user => {
      let code = getParameterByName('code');
      if (code) {
        authService.userManager.signinRedirectCallback().then(function () {
          window.location.href = "./index.html";
        }).catch(function (e) {
          console.error(e);
        });
      } else {
        if (user) {
          console.log('User has been successfully loaded from store.');
        } else {
          authService.login();
        }
      }
    });
  });

  const getParameterByName = (name: string) => {
    let url = window.location.href
    name = name.replace(/[\[\]]/g, '\\$&');
    var regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)'),
      results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, ' '));
  }

  return (
    <Layout>
      <Header className="header">
        <div className="logo" />
        <Menu theme="dark" mode="horizontal" items={items1} />
      </Header>
      <Layout>
        <Sider width={250} style={{ background: colorBgContainer }}>
          <Menu
            mode="inline"
            defaultSelectedKeys={['flow-sub-01']}
            defaultOpenKeys={['flow-sub']}
            style={{ height: '100%', borderRight: 0 }}
            items={items}
            onClick={(e) => {
              if (e.key === 'logout') {
                let authService = new AuthService();
                authService.getUser().then(user => {
                  if (user && user.access_token) {
                    axios({
                      url: `${process.env.REACT_APP_STS_AUTHORITY}api/account/logout`,
                      method: 'get',
                      headers: {
                        'Authorization': ('Bearer ' + user.access_token)
                      }
                    }).then((response) => {
                      authService.logout().then(() => {
                        window.location.href = "./index.html";
                      });
                    });
                  }
                });
              }
            }}
          />
        </Sider>
        <Layout style={{ padding: '0 24px 24px' }}>
          <Breadcrumb style={{ margin: '16px 0' }}>
            <Breadcrumb.Item>FLOW Blockchain</Breadcrumb.Item>
            <Breadcrumb.Item>FLOW Token Transaction</Breadcrumb.Item>
          </Breadcrumb>
          <Content
            style={{
              padding: 24,
              margin: 0,
              minHeight: 1000,
              background: colorBgContainer,
            }}
          >
            <BatchTransaction />

          </Content>
        </Layout>
      </Layout>
    </Layout>
  );
};

export default App;
