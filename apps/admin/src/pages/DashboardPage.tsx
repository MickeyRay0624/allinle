import { Card, Col, Row, Statistic, Typography, message } from "antd";
import { useEffect, useState } from "react";
import { api } from "../api/client";

interface DashboardData {
  userCount: number;
  todayLedgerGames: number;
  todayPracticeRooms: number;
  onlineRooms: number;
  riskLogCount: number;
}

export function DashboardPage() {
  const [data, setData] = useState<DashboardData>({
    userCount: 0,
    todayLedgerGames: 0,
    todayPracticeRooms: 0,
    onlineRooms: 0,
    riskLogCount: 0
  });

  useEffect(() => {
    api.get<DashboardData>("/admin/dashboard").then(setData).catch((error) => {
      message.error(error.message);
    });
  }, []);

  return (
    <>
      <Typography.Title level={3} className="page-title">
        数据看板
      </Typography.Title>
      <Row gutter={[16, 16]}>
        <Col xs={24} md={12} xl={6}>
          <Card>
            <Statistic title="用户数" value={data.userCount} />
          </Card>
        </Col>
        <Col xs={24} md={12} xl={6}>
          <Card>
            <Statistic title="今日记账场次" value={data.todayLedgerGames} />
          </Card>
        </Col>
        <Col xs={24} md={12} xl={6}>
          <Card>
            <Statistic title="今日练习房数量" value={data.todayPracticeRooms} />
          </Card>
        </Col>
        <Col xs={24} md={12} xl={6}>
          <Card>
            <Statistic title="当前进行中练习房数量" value={data.onlineRooms} />
          </Card>
        </Col>
        <Col xs={24} md={12} xl={6}>
          <Card>
            <Statistic title="风控日志数量" value={data.riskLogCount} />
          </Card>
        </Col>
      </Row>
    </>
  );
}
